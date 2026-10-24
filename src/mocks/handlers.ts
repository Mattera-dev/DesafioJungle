import { delay, http, HttpResponse } from 'msw';
import {
  ChangePasswordPayload,
  CreateOrderPayload,
  LoginPayload,
  MockScenario,
  NFTCategory,
  NFTEditionType,
  Order,
  OrderItemSnapshot,
  RegisterPayload,
  SortOption,
  UpdateProfilePayload,
  UpsertWalletPayload,
  User,
  WalletNetwork,
} from '@/types/contracts';
import { addEth, compareEth, mulEth, parseEthToMicro } from '@/lib/eth';
import { COUPONS, MockUserRecord } from './fixtures';
import {
  computeCartResponse,
  getCartForOwner,
  getDb,
  getMockScenario,
  mergeGuestCartIntoUser,
  resetMockDb,
  saveDb,
  setMockScenario,
} from './db';
import {
  disconnectAllSocketClients,
  simulateNftMutationAndEmit,
  simulateOrderStatusAndEmit,
  socketHandlers,
} from './socket';

let outOfOrderCounter = 0;

function stripPassword(user: MockUserRecord): User {
  const { passwordHash: _pw, ...safeUser } = user;
  return safeUser;
}

function getScenarioFromRequest(request: Request): MockScenario {
  const headerScenario = request.headers.get('x-mock-scenario') as MockScenario | null;
  if (headerScenario) return headerScenario;
  return getMockScenario();
}

async function applyNetworkCondition(request: Request, isCatalogQuery = false) {
  const scenario = getScenarioFromRequest(request);
  if (scenario === 'slow') {
    await delay(1400);
  } else if (scenario === 'out-of-order' && isCatalogQuery) {
    outOfOrderCounter += 1;

    await delay(outOfOrderCounter % 2 === 1 ? 900 : 80);
  } else {
    await delay(40);
  }

  if (scenario === 'network-error') {
    return HttpResponse.error();
  }
  if (scenario === 'http-500') {
    return HttpResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: 'Falha temporária de comunicação com o nó da rede. Tente novamente.',
      },
      { status: 500 }
    );
  }
  return null;
}

function resolveAuthenticatedUser(request: Request): {
  user: MockUserRecord | null;
  token: string | null;
  expired: boolean;
} {
  const scenario = getScenarioFromRequest(request);
  if (scenario === 'session-expired') {
    return { user: null, token: null, expired: true };
  }
  if (scenario === 'unauthorized') {
    return { user: null, token: null, expired: false };
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) {
    return { user: null, token: null, expired: false };
  }

  const db = getDb();
  const session = db.sessions[token];
  if (!session) {
    return { user: null, token, expired: true };
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    delete db.sessions[token];
    saveDb();
    return { user: null, token, expired: true };
  }

  const user = db.users.find((u) => u.id === session.userId) || null;
  return { user, token, expired: false };
}

function requireAuth(request: Request) {
  const { user, expired } = resolveAuthenticatedUser(request);
  if (!user) {
    return {
      user: null,
      errorResponse: HttpResponse.json(
        {
          code: expired ? 'SESSION_EXPIRED' : 'UNAUTHORIZED',
          message: expired
            ? 'Sua sessão expirou. Faça login novamente para continuar.'
            : 'Autenticação necessária para acessar este recurso.',
        },
        { status: 401 }
      ),
    };
  }
  return { user, errorResponse: null };
}

function getCartOwnerKey(request: Request): string {
  const { user } = resolveAuthenticatedUser(request);
  return user ? user.id : 'guest';
}

export const restHandlers = [

  http.post('/api/__mock/reset', () => {
    const state = resetMockDb();
    return HttpResponse.json({ ok: true, totalNfts: state.nfts.length });
  }),

  http.post('/api/__mock/scenario', async ({ request }) => {
    const body = (await request.json()) as { scenario: MockScenario };
    setMockScenario(body.scenario);
    return HttpResponse.json({ ok: true, scenario: body.scenario });
  }),

  http.post('/api/__mock/nft-event', async ({ request }) => {
    const body = (await request.json()) as {
      nftId: string;
      newPriceEth?: string;
      editionType?: NFTEditionType;
      newAvailable?: number;
      forceVersion?: number;
      eventId?: string;
    };
    const evt = simulateNftMutationAndEmit(body);
    return HttpResponse.json({ ok: Boolean(evt), event: evt });
  }),

  http.post('/api/__mock/order-event', async ({ request }) => {
    const body = (await request.json()) as {
      orderId: string;
      status: 'pending' | 'confirmed' | 'rejected';
      failureReason?: string;
      forceVersion?: number;
      eventId?: string;
    };
    const evt = simulateOrderStatusAndEmit(body);
    return HttpResponse.json({ ok: Boolean(evt), event: evt });
  }),

  http.post('/api/__mock/socket-disconnect', () => {
    disconnectAllSocketClients();
    return HttpResponse.json({ ok: true });
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const netErr = await applyNetworkCondition(request);
    if (netErr) return netErr;

    const body = (await request.json()) as LoginPayload;
    const fieldErrors: Record<string, string> = {};
    if (!body.email?.trim()) fieldErrors.email = 'Informe seu e-mail.';
    if (!body.password?.trim()) fieldErrors.password = 'Informe sua senha.';
    if (Object.keys(fieldErrors).length > 0) {
      return HttpResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Verifique os campos obrigatórios.', fieldErrors },
        { status: 422 }
      );
    }

    const db = getDb();
    const user = db.users.find(
      (u) => u.email.toLowerCase() === body.email.trim().toLowerCase()
    );
    const expectedHash = `hashed:${body.password}`;
    if (!user || user.passwordHash !== expectedHash) {
      return HttpResponse.json(
        {
          code: 'INVALID_CREDENTIALS',
          message: 'E-mail ou senha inválidos. Verifique suas credenciais.',
        },
        { status: 401 }
      );
    }

    mergeGuestCartIntoUser(user.id);

    const token = `kurio-tok-${user.id}-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString();
    db.sessions[token] = { userId: user.id, expiresAt };
    saveDb();

    return HttpResponse.json({
      user: stripPassword(user),
      token,
      expiresAt,
    });
  }),

  http.post('/api/auth/register', async ({ request }) => {
    const netErr = await applyNetworkCondition(request);
    if (netErr) return netErr;

    const scenario = getScenarioFromRequest(request);
    const body = (await request.json()) as RegisterPayload;
    const fieldErrors: Record<string, string> = {};

    if (!body.name || body.name.trim().length < 2) {
      fieldErrors.name = 'Nome deve ter pelo menos 2 caracteres.';
    }
    if (!body.username || body.username.trim().length < 3) {
      fieldErrors.username = 'Nome de usuário deve ter pelo menos 3 caracteres.';
    }
    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      fieldErrors.email = 'Informe um endereço de e-mail válido.';
    }
    if (!body.password || body.password.length < 6) {
      fieldErrors.password = 'A senha deve conter no mínimo 6 caracteres.';
    }

    if (Object.keys(fieldErrors).length > 0) {
      return HttpResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Corrija os erros no formulário.', fieldErrors },
        { status: 422 }
      );
    }

    const db = getDb();
    const emailConflict = db.users.some(
      (u) => u.email.toLowerCase() === body.email.trim().toLowerCase()
    );
    const usernameConflict = db.users.some(
      (u) => u.username.toLowerCase() === body.username.trim().toLowerCase()
    );

    if (scenario === 'conflict-register' || emailConflict || usernameConflict) {
      return HttpResponse.json(
        {
          code: 'CONFLICT',
          message: 'Já existe uma conta cadastrada com este e-mail ou nome de usuário.',
          fieldErrors: {
            ...(emailConflict || scenario === 'conflict-register'
              ? { email: 'Este e-mail já está em uso.' }
              : {}),
            ...(usernameConflict ? { username: 'Este nome de usuário já está em uso.' } : {}),
          },
        },
        { status: 409 }
      );
    }

    const newUser: MockUserRecord = {
      id: `user-${db.users.length + 1}-${Date.now()}`,
      name: body.name.trim(),
      username: body.username.trim().toLowerCase(),
      email: body.email.trim().toLowerCase(),
      passwordHash: `hashed:${body.password}`,
      avatar: '/assets/nfts/emerald-ape.png',
      bio: 'Colecionador na Kurio Marketplace.',
      phone: '',
      profileName: `${body.username.trim()}.Kurio`,
      referralCode: `KURIO-${body.username.trim().slice(0, 4).toUpperCase()}26`,
      ensName: body.username.trim().toLowerCase(),
      ensDomain: '.eth',
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    db.favoritesByUser[newUser.id] = [];
    mergeGuestCartIntoUser(newUser.id);

    const token = `kurio-tok-${newUser.id}-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString();
    db.sessions[token] = { userId: newUser.id, expiresAt };
    saveDb();

    return HttpResponse.json(
      {
        user: stripPassword(newUser),
        token,
        expiresAt,
      },
      { status: 201 }
    );
  }),

  http.get('/api/auth/session', async ({ request }) => {
    const netErr = await applyNetworkCondition(request);
    if (netErr) return netErr;

    const { user, token, expired } = resolveAuthenticatedUser(request);
    if (!user || !token) {
      return HttpResponse.json(
        {
          code: expired ? 'SESSION_EXPIRED' : 'UNAUTHORIZED',
          message: expired ? 'Sessão expirada.' : 'Não autenticado.',
        },
        { status: 401 }
      );
    }

    const db = getDb();
    return HttpResponse.json({
      user: stripPassword(user),
      token,
      expiresAt: db.sessions[token].expiresAt,
    });
  }),

  http.post('/api/auth/logout', async ({ request }) => {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    if (token) {
      const db = getDb();
      delete db.sessions[token];
      saveDb();
    }
    return HttpResponse.json({ ok: true });
  }),

  http.post('/api/auth/expire', async ({ request }) => {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const db = getDb();
    if (token && db.sessions[token]) {
      db.sessions[token].expiresAt = new Date(Date.now() - 1000).toISOString();
    } else {
      for (const k of Object.keys(db.sessions)) {
        db.sessions[k].expiresAt = new Date(Date.now() - 1000).toISOString();
      }
    }
    saveDb();
    return HttpResponse.json({ ok: true });
  }),

  http.get('/api/nfts', async ({ request }) => {
    const netErr = await applyNetworkCondition(request, true);
    if (netErr) return netErr;

    const scenario = getScenarioFromRequest(request);
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    const categoriesParam = url.searchParams.get('categories');
    const networksParam = url.searchParams.get('networks');
    const minPrice = url.searchParams.get('minPrice');
    const maxPrice = url.searchParams.get('maxPrice');
    const tab = url.searchParams.get('tab') || 'all';
    const sort = (url.searchParams.get('sort') as SortOption) || 'recent';
    const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
    const limit = Math.max(1, Number(url.searchParams.get('limit') || '9'));

    const categories = categoriesParam
      ? (categoriesParam.split(',').filter(Boolean) as NFTCategory[])
      : [];
    const networks = networksParam
      ? (networksParam.split(',').filter(Boolean) as WalletNetwork[])
      : [];

    const db = getDb();

    const categoryFacets: Record<string, number> = {
      'Arte digital': 18,
      Fotografia: 12,
      Música: 23,
      'Arte 3D': 34,
      Colecionáveis: 12,
      Generativa: 17,
      Jogos: 15,
      Avatares: 13,
      Utilidade: 16,
    };
    const networkFacets: Record<string, number> = {
      Ethereum: 210,
      Polygon: 94,
      Solana: 62,
    };

    if (scenario === 'empty') {
      return HttpResponse.json({
        items: [],
        total: 0,
        page: 1,
        limit,
        totalPages: 1,
        facets: { categories: categoryFacets, networks: networkFacets },
      });
    }

    let filtered = [...db.nfts];

    if (q) {
      filtered = filtered.filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          n.collection.toLowerCase().includes(q) ||
          n.tokenId.toLowerCase().includes(q) ||
          n.category.toLowerCase().includes(q)
      );
    }

    if (categories.length > 0) {
      filtered = filtered.filter((n) => categories.includes(n.category));
    }

    if (networks.length > 0) {
      filtered = filtered.filter((n) => networks.includes(n.network));
    }

    if (minPrice) {
      const minMicro = parseEthToMicro(minPrice);
      filtered = filtered.filter((n) => parseEthToMicro(n.priceEth) >= minMicro);
    }

    if (maxPrice) {
      const maxMicro = parseEthToMicro(maxPrice);
      filtered = filtered.filter((n) => parseEthToMicro(n.priceEth) <= maxMicro);
    }

    if (tab === 'new') {
      filtered = filtered.filter((n) => n.isNewRelease);
    } else if (tab === 'trending') {
      filtered = filtered.filter((n) => n.isTrending);
    }

    if (sort === 'price_asc') {
      filtered.sort((a, b) => compareEth(a.priceEth, b.priceEth));
    } else if (sort === 'price_desc') {
      filtered.sort((a, b) => compareEth(b.priceEth, a.priceEth));
    } else if (sort === 'popular') {
      filtered.sort((a, b) => b.reviewCount - a.reviewCount);
    } else {
      filtered.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    return HttpResponse.json({
      items,
      total,
      page,
      limit,
      totalPages,
      facets: {
        categories: categoryFacets,
        networks: networkFacets,
      },
    });
  }),

  http.get('/api/nfts/:id', async ({ request, params }) => {
    const netErr = await applyNetworkCondition(request);
    if (netErr) return netErr;

    const db = getDb();
    const nft = db.nfts.find((n) => n.id === params.id);
    if (!nft) {
      return HttpResponse.json(
        {
          code: 'NOT_FOUND',
          message: 'O NFT solicitado não foi encontrado ou foi removido do catálogo.',
        },
        { status: 404 }
      );
    }

    const relatedIds = [
      'cosmic-bloom-118',
      'violet-nomad-314',
      'ivory-baron-088',
      'golden-beat-207',
      'golden-signal-160',
    ];
    const related = relatedIds
      .map((id) => db.nfts.find((n) => n.id === id))
      .filter((n): n is NonNullable<typeof n> => Boolean(n));

    return HttpResponse.json({
      nft,
      related,
    });
  }),

  http.get('/api/favorites', async ({ request }) => {
    const netErr = await applyNetworkCondition(request);
    if (netErr) return netErr;

    const { user, errorResponse } = requireAuth(request);
    if (errorResponse) return errorResponse;

    const db = getDb();
    const favIds = db.favoritesByUser[user.id] || [];
    const items = db.nfts.filter((n) => favIds.includes(n.id));
    return HttpResponse.json({ ids: favIds, items });
  }),

  http.post('/api/favorites/:nftId', async ({ request, params }) => {
    const netErr = await applyNetworkCondition(request);
    if (netErr) return netErr;

    const { user, errorResponse } = requireAuth(request);
    if (errorResponse) return errorResponse;

    const nftId = String(params.nftId);
    const db = getDb();
    const nft = db.nfts.find((n) => n.id === nftId);
    if (!nft) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'NFT não encontrado.' },
        { status: 404 }
      );
    }

    if (!db.favoritesByUser[user.id]) {
      db.favoritesByUser[user.id] = [];
    }
    if (!db.favoritesByUser[user.id].includes(nftId)) {
      db.favoritesByUser[user.id].push(nftId);
      saveDb();
    }

    return HttpResponse.json({ ids: db.favoritesByUser[user.id] });
  }),

  http.delete('/api/favorites/:nftId', async ({ request, params }) => {
    const netErr = await applyNetworkCondition(request);
    if (netErr) return netErr;

    const { user, errorResponse } = requireAuth(request);
    if (errorResponse) return errorResponse;

    const nftId = String(params.nftId);
    const db = getDb();
    db.favoritesByUser[user.id] = (db.favoritesByUser[user.id] || []).filter(
      (id) => id !== nftId
    );
    saveDb();

    return HttpResponse.json({ ids: db.favoritesByUser[user.id] });
  }),

  http.get('/api/cart', async ({ request }) => {
    const netErr = await applyNetworkCondition(request);
    if (netErr) return netErr;

    const ownerKey = getCartOwnerKey(request);
    return HttpResponse.json(computeCartResponse(ownerKey));
  }),

  http.post('/api/cart/items', async ({ request }) => {
    const netErr = await applyNetworkCondition(request);
    if (netErr) return netErr;

    const ownerKey = getCartOwnerKey(request);
    const body = (await request.json()) as {
      nftId: string;
      edition: NFTEditionType;
      quantity: number;
    };

    const db = getDb();
    const nft = db.nfts.find((n) => n.id === body.nftId);
    if (!nft) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'NFT não encontrado.' },
        { status: 404 }
      );
    }

    const editionObj = nft.editions.find((e) => e.type === body.edition);
    if (!editionObj || editionObj.available <= 0) {
      return HttpResponse.json(
        {
          code: 'EDITION_UNAVAILABLE',
          message: `A edição ${body.edition} está esgotada no momento.`,
        },
        { status: 409 }
      );
    }

    const cart = getCartForOwner(ownerKey);
    const existing = cart.items.find(
      (i) => i.nftId === body.nftId && i.edition === body.edition
    );
    const desiredQty = (existing ? existing.quantity : 0) + Math.max(1, Math.floor(body.quantity));

    if (desiredQty > editionObj.available) {
      return HttpResponse.json(
        {
          code: 'QUANTITY_LIMIT_EXCEEDED',
          message: `Limite disponível para a edição ${body.edition}: ${editionObj.available} unidade(s).`,
        },
        { status: 409 }
      );
    }

    if (existing) {
      existing.quantity = desiredQty;
      existing.acknowledgedPriceEth = editionObj.priceEth;
    } else {
      cart.items.push({
        id: `${ownerKey}-${body.nftId}-${body.edition.replace('/', '_')}`,
        nftId: body.nftId,
        edition: body.edition,
        quantity: desiredQty,
        addedUnitPriceEth: editionObj.priceEth,
        acknowledgedPriceEth: editionObj.priceEth,
      });
    }
    cart.quoteVersion += 1;
    saveDb();

    return HttpResponse.json(computeCartResponse(ownerKey));
  }),

  http.patch('/api/cart/items/:itemId', async ({ request, params }) => {
    const netErr = await applyNetworkCondition(request);
    if (netErr) return netErr;

    const ownerKey = getCartOwnerKey(request);
    const itemId = String(params.itemId);
    const body = (await request.json()) as { quantity: number };
    const newQty = Math.floor(body.quantity);

    const db = getDb();
    const cart = getCartForOwner(ownerKey);
    const itemIdx = cart.items.findIndex((i) => i.id === itemId);
    if (itemIdx === -1) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Item não encontrado no carrinho.' },
        { status: 404 }
      );
    }

    if (newQty <= 0) {
      cart.items.splice(itemIdx, 1);
      cart.quoteVersion += 1;
      saveDb();
      return HttpResponse.json(computeCartResponse(ownerKey));
    }

    const item = cart.items[itemIdx];
    const nft = db.nfts.find((n) => n.id === item.nftId);
    const editionObj = nft?.editions.find((e) => e.type === item.edition);
    if (!editionObj || newQty > editionObj.available) {
      return HttpResponse.json(
        {
          code: 'QUANTITY_LIMIT_EXCEEDED',
          message: `Disponibilidade máxima para esta edição: ${editionObj?.available ?? 0}.`,
        },
        { status: 409 }
      );
    }

    item.quantity = newQty;
    item.acknowledgedPriceEth = editionObj.priceEth;
    cart.quoteVersion += 1;
    saveDb();

    return HttpResponse.json(computeCartResponse(ownerKey));
  }),

  http.delete('/api/cart/items/:itemId', async ({ request, params }) => {
    const netErr = await applyNetworkCondition(request);
    if (netErr) return netErr;

    const ownerKey = getCartOwnerKey(request);
    const itemId = String(params.itemId);
    const cart = getCartForOwner(ownerKey);
    cart.items = cart.items.filter((i) => i.id !== itemId);
    if (cart.items.length === 0) {
      cart.couponCode = null;
    }
    cart.quoteVersion += 1;
    saveDb();

    return HttpResponse.json(computeCartResponse(ownerKey));
  }),

  http.post('/api/cart/acknowledge', async ({ request }) => {
    const ownerKey = getCartOwnerKey(request);
    const db = getDb();
    const cart = getCartForOwner(ownerKey);

    cart.items = cart.items
      .map((item) => {
        const nft = db.nfts.find((n) => n.id === item.nftId);
        const edition = nft?.editions.find((e) => e.type === item.edition);
        if (!nft || !edition || edition.available <= 0) return null;
        return {
          ...item,
          quantity: Math.min(item.quantity, edition.available),
          acknowledgedPriceEth: edition.priceEth,
        };
      })
      .filter(Boolean) as typeof cart.items;

    cart.quoteVersion += 1;
    saveDb();
    return HttpResponse.json(computeCartResponse(ownerKey));
  }),

  http.post('/api/quote', async ({ request }) => {
    const netErr = await applyNetworkCondition(request);
    if (netErr) return netErr;

    const scenario = getScenarioFromRequest(request);
    const ownerKey = getCartOwnerKey(request);
    const body = (await request.json().catch(() => ({}))) as { couponCode?: string | null };
    const cart = getCartForOwner(ownerKey);

    if (body.couponCode !== undefined) {
      const code = body.couponCode?.trim().toUpperCase() || null;
      if (!code) {
        cart.couponCode = null;
      } else {
        if (scenario === 'coupon-invalid') {
          return HttpResponse.json(
            {
              code: 'COUPON_INVALID',
              message: 'Código promocional inválido ou não reconhecido.',
            },
            { status: 422 }
          );
        }
        if (scenario === 'coupon-expired') {
          return HttpResponse.json(
            {
              code: 'COUPON_EXPIRED',
              message: 'Este código promocional expirou e não pode mais ser utilizado.',
            },
            { status: 422 }
          );
        }

        const coupon = COUPONS[code];
        if (!coupon) {
          return HttpResponse.json(
            {
              code: 'COUPON_INVALID',
              message: 'Código promocional inválido ou não encontrado.',
            },
            { status: 422 }
          );
        }
        if (coupon.expired) {
          return HttpResponse.json(
            {
              code: 'COUPON_EXPIRED',
              message: 'Este código promocional expirou.',
            },
            { status: 422 }
          );
        }
        cart.couponCode = coupon.code;
      }
      cart.quoteVersion += 1;
      saveDb();
    }

    const computed = computeCartResponse(ownerKey);
    const couponInfo = computed.couponCode ? COUPONS[computed.couponCode] : undefined;

    return HttpResponse.json({
      subtotalEth: computed.subtotalEth,
      discountEth: computed.discountEth,
      networkFeeEth: computed.networkFeeEth,
      totalEth: computed.totalEth,
      couponCode: computed.couponCode,
      couponDescription: couponInfo?.description,
      quoteVersion: computed.quoteVersion,
      valid: !computed.hasOutdatedItems,
    });
  }),

  http.delete('/api/cart/coupon', async ({ request }) => {
    const ownerKey = getCartOwnerKey(request);
    const cart = getCartForOwner(ownerKey);
    cart.couponCode = null;
    cart.quoteVersion += 1;
    saveDb();
    return HttpResponse.json(computeCartResponse(ownerKey));
  }),

  http.post('/api/orders', async ({ request }) => {
    const netErr = await applyNetworkCondition(request);
    if (netErr) return netErr;

    const { user, errorResponse } = requireAuth(request);
    if (errorResponse) return errorResponse;

    const scenario = getScenarioFromRequest(request);
    const body = (await request.json()) as CreateOrderPayload;
    const idempotencyKey =
      request.headers.get('idempotency-key') || body.idempotencyKey?.trim();

    if (!idempotencyKey) {
      return HttpResponse.json(
        {
          code: 'MISSING_IDEMPOTENCY_KEY',
          message: 'Chave de idempotência obrigatória para processar o pedido.',
        },
        { status: 400 }
      );
    }

    const db = getDb();
    const payloadSignature = JSON.stringify({
      userId: user.id,
      items: body.items.map((i) => ({
        nftId: i.nftId,
        edition: i.edition,
        quantity: i.quantity,
      })),
      couponCode: body.couponCode || null,
    });

    const existingIdemp = db.idempotencyEntries[idempotencyKey];
    if (existingIdemp) {
      if (
        existingIdemp.userId !== user.id ||
        existingIdemp.payloadSignature !== payloadSignature
      ) {
        return HttpResponse.json(
          {
            code: 'IDEMPOTENCY_CONFLICT',
            message:
              'A chave de idempotência já foi utilizada com parâmetros de pedido diferentes.',
          },
          { status: 409 }
        );
      }
      const existingOrder = db.orders.find((o) => o.id === existingIdemp.orderId);
      if (existingOrder) {
        return HttpResponse.json({ order: existingOrder });
      }
    }

    const fieldErrors: Record<string, string> = {};
    const c = body.collector;
    if (!c?.displayName?.trim()) fieldErrors.displayName = 'Informe o nome de exibição.';
    if (!c?.username?.trim()) fieldErrors.username = 'Informe o nome de usuário.';
    if (!c?.network) fieldErrors.network = 'Selecione uma rede.';
    if (!c?.profileName?.trim()) fieldErrors.profileName = 'Informe o nome do perfil.';
    if (!c?.walletAddress?.trim() || c.walletAddress.trim().length < 10) {
      fieldErrors.walletAddress = 'Informe um endereço de carteira válido.';
    }
    if (!c?.walletType) fieldErrors.walletType = 'Selecione um tipo de carteira.';
    if (!c?.referralCode?.trim()) fieldErrors.referralCode = 'Informe o código de indicação.';
    if (!c?.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) {
      fieldErrors.email = 'Informe um e-mail válido.';
    }
    if (!c?.ensName?.trim()) fieldErrors.ensName = 'Informe o nome ENS.';

    if (Object.keys(fieldErrors).length > 0) {
      return HttpResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Preencha todos os campos obrigatórios do perfil do colecionador.',
          fieldErrors,
        },
        { status: 422 }
      );
    }

    if (scenario === 'price-changed' && body.items.length > 0) {
      const targetId = body.items[0].nftId;
      const targetNft = db.nfts.find((n) => n.id === targetId);
      if (targetNft) {
        const nextPrice = addEth(targetNft.priceEth, '0.25');
        simulateNftMutationAndEmit({
          nftId: targetId,
          newPriceEth: nextPrice,
        });
      }
    } else if (scenario === 'edition-exhausted' && body.items.length > 0) {
      const target = body.items[0];
      simulateNftMutationAndEmit({
        nftId: target.nftId,
        editionType: target.edition,
        newAvailable: 0,
      });
    }

    for (const reqItem of body.items) {
      const nft = db.nfts.find((n) => n.id === reqItem.nftId);
      const edition = nft?.editions.find((e) => e.type === reqItem.edition);
      if (!nft || !edition || edition.available < reqItem.quantity) {
        return HttpResponse.json(
          {
            code: 'AVAILABILITY_CHANGED',
            message: `A disponibilidade de "${nft?.name ?? reqItem.nftId}" (${reqItem.edition}) mudou. Revise sua cotação antes de confirmar.`,
          },
          { status: 409 }
        );
      }
      if (edition.priceEth !== reqItem.expectedUnitPriceEth) {
        return HttpResponse.json(
          {
            code: 'QUOTE_OUTDATED',
            message: `O preço de "${nft.name}" foi atualizado para ${edition.priceEth} ETH. Confirme a nova cotação para prosseguir.`,
          },
          { status: 409 }
        );
      }
    }

    const cartSummary = computeCartResponse(user.id);
    if (cartSummary.hasOutdatedItems || cartSummary.totalEth !== body.expectedTotalEth) {
      return HttpResponse.json(
        {
          code: 'QUOTE_OUTDATED',
          message:
            'Os valores da cotação mudaram desde a última revisão. Confirme os novos valores antes de finalizar.',
          details: cartSummary,
        },
        { status: 409 }
      );
    }

    const snapshots: OrderItemSnapshot[] = body.items.map((reqItem) => {
      const nft = db.nfts.find((n) => n.id === reqItem.nftId)!;
      const edition = nft.editions.find((e) => e.type === reqItem.edition)!;
      return {
        nftId: nft.id,
        name: nft.name,
        tokenId: nft.tokenId,
        image: nft.image,
        edition: reqItem.edition,
        quantity: reqItem.quantity,
        unitPriceEth: edition.priceEth,
        lineTotalEth: mulEth(edition.priceEth, reqItem.quantity),
      };
    });

    const txHex = Array.from({ length: 16 }, (_, i) =>
      ((Date.now() + i * 31) % 256).toString(16).padStart(2, '0')
    ).join('');
    const orderId = `ord-${Date.now().toString(36)}`;

    const newOrder: Order = {
      id: orderId,
      userId: user.id,
      idempotencyKey,
      status: 'pending',
      transactionHash: `0x9f8c${txHex}7a42e8`,
      explorerUrl: `https://etherscan.io/tx/0x9f8c${txHex}7a42e8`,
      network: c.network,
      walletType: c.walletType,
      walletAddress: c.walletAddress,
      collector: c,
      items: snapshots,
      couponCode: cartSummary.couponCode,
      subtotalEth: cartSummary.subtotalEth,
      discountEth: cartSummary.discountEth,
      networkFeeEth: cartSummary.networkFeeEth,
      totalEth: cartSummary.totalEth,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    db.orders.unshift(newOrder);
    db.idempotencyEntries[idempotencyKey] = {
      key: idempotencyKey,
      userId: user.id,
      payloadSignature,
      orderId: newOrder.id,
    };
    saveDb();

    const targetOutcome =
      scenario === 'payment-rejected' ? 'rejected' : 'confirmed';

    setTimeout(() => {
      simulateOrderStatusAndEmit({
        orderId: newOrder.id,
        status: targetOutcome,
        failureReason:
          targetOutcome === 'rejected'
            ? 'Transação recusada pela carteira ou saldo insuficiente para cobrir taxa de rede.'
            : undefined,
      });
    }, 350);

    if (scenario === 'order-timeout') {
      setMockScenario('default');
      await delay(300);
      return HttpResponse.json(
        {
          code: 'GATEWAY_TIMEOUT',
          message: 'Tempo limite excedido aguardando resposta do nó. Reenvie para recuperar o pedido.',
        },
        { status: 504 }
      );
    }

    return HttpResponse.json({ order: newOrder }, { status: 201 });
  }),

  http.get('/api/orders', async ({ request }) => {
    const netErr = await applyNetworkCondition(request);
    if (netErr) return netErr;

    const { user, errorResponse } = requireAuth(request);
    if (errorResponse) return errorResponse;

    const db = getDb();
    const userOrders = db.orders.filter((o) => o.userId === user.id);
    return HttpResponse.json({ orders: userOrders });
  }),

  http.get('/api/orders/:id', async ({ request, params }) => {
    const netErr = await applyNetworkCondition(request);
    if (netErr) return netErr;

    const { user, errorResponse } = requireAuth(request);
    if (errorResponse) return errorResponse;

    const db = getDb();
    const order = db.orders.find((o) => o.id === params.id);
    if (!order) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Pedido não encontrado.' },
        { status: 404 }
      );
    }
    if (order.userId !== user.id) {
      return HttpResponse.json(
        {
          code: 'FORBIDDEN',
          message: 'Você não tem permissão para visualizar o pedido de outro colecionador.',
        },
        { status: 403 }
      );
    }

    return HttpResponse.json({ order });
  }),

  http.get('/api/profile', async ({ request }) => {
    const netErr = await applyNetworkCondition(request);
    if (netErr) return netErr;

    const { user, errorResponse } = requireAuth(request);
    if (errorResponse) return errorResponse;

    return HttpResponse.json({ user: stripPassword(user) });
  }),

  http.put('/api/profile', async ({ request }) => {
    const netErr = await applyNetworkCondition(request);
    if (netErr) return netErr;

    const { user, errorResponse } = requireAuth(request);
    if (errorResponse) return errorResponse;

    const body = (await request.json()) as UpdateProfilePayload;
    const fieldErrors: Record<string, string> = {};

    if (!body.name || body.name.trim().length < 2) {
      fieldErrors.name = 'Nome deve ter no mínimo 2 caracteres.';
    }
    if (!body.username || body.username.trim().length < 3) {
      fieldErrors.username = 'Nome de usuário deve ter no mínimo 3 caracteres.';
    }
    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      fieldErrors.email = 'Informe um e-mail válido.';
    }

    const db = getDb();
    const emailTaken = db.users.some(
      (u) => u.id !== user.id && u.email.toLowerCase() === body.email?.trim().toLowerCase()
    );
    if (emailTaken) {
      fieldErrors.email = 'Este e-mail já está vinculado a outra conta.';
    }

    if (Object.keys(fieldErrors).length > 0) {
      return HttpResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Verifique os dados informados.', fieldErrors },
        { status: 422 }
      );
    }

    user.name = body.name.trim();
    user.username = body.username.trim();
    user.email = body.email.trim();
    if (body.bio !== undefined) user.bio = body.bio;
    if (body.phone !== undefined) user.phone = body.phone;
    if (body.avatar !== undefined) user.avatar = body.avatar;
    if (body.profileName !== undefined) user.profileName = body.profileName;
    saveDb();

    return HttpResponse.json({ user: stripPassword(user) });
  }),

  http.put('/api/profile/password', async ({ request }) => {
    const netErr = await applyNetworkCondition(request);
    if (netErr) return netErr;

    const { user, errorResponse } = requireAuth(request);
    if (errorResponse) return errorResponse;

    const body = (await request.json()) as ChangePasswordPayload;
    const fieldErrors: Record<string, string> = {};

    if (!body.currentPassword) {
      fieldErrors.currentPassword = 'Informe a senha atual.';
    } else if (user.passwordHash !== `hashed:${body.currentPassword}`) {
      fieldErrors.currentPassword = 'A senha atual está incorreta.';
    }

    if (!body.newPassword || body.newPassword.length < 6) {
      fieldErrors.newPassword = 'A nova senha deve ter no mínimo 6 caracteres.';
    }

    if (body.newPassword !== body.confirmPassword) {
      fieldErrors.confirmPassword = 'A confirmação de senha não confere.';
    }

    if (Object.keys(fieldErrors).length > 0) {
      return HttpResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Não foi possível alterar a senha.', fieldErrors },
        { status: 422 }
      );
    }

    user.passwordHash = `hashed:${body.newPassword}`;
    saveDb();

    return HttpResponse.json({ ok: true, message: 'Senha atualizada com sucesso.' });
  }),

  http.get('/api/wallets', async ({ request }) => {
    const netErr = await applyNetworkCondition(request);
    if (netErr) return netErr;

    const { user, errorResponse } = requireAuth(request);
    if (errorResponse) return errorResponse;

    const db = getDb();
    const userWallets = db.wallets.filter((w) => w.userId === user.id);
    return HttpResponse.json({ wallets: userWallets });
  }),

  http.put('/api/wallets', async ({ request }) => {
    const netErr = await applyNetworkCondition(request);
    if (netErr) return netErr;

    const { user, errorResponse } = requireAuth(request);
    if (errorResponse) return errorResponse;

    const body = (await request.json()) as UpsertWalletPayload;
    const fieldErrors: Record<string, string> = {};

    if (!body.displayName?.trim()) fieldErrors.displayName = 'Informe o nome de exibição.';
    if (!body.nickname?.trim()) fieldErrors.nickname = 'Informe o apelido da carteira.';
    if (!body.network) fieldErrors.network = 'Selecione uma rede.';
    if (!body.profileName?.trim()) fieldErrors.profileName = 'Informe o nome do perfil.';
    if (!body.address?.trim() || body.address.trim().length < 10) {
      fieldErrors.address = 'Informe um endereço de carteira válido (ex: 0x...).';
    }
    if (!body.walletType) fieldErrors.walletType = 'Selecione um tipo de carteira.';
    if (!body.referralCode?.trim()) fieldErrors.referralCode = 'Informe o código de indicação.';
    if (!body.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      fieldErrors.email = 'Informe um e-mail válido.';
    }
    if (!body.ensName?.trim()) fieldErrors.ensName = 'Informe o nome ENS.';

    if (Object.keys(fieldErrors).length > 0) {
      return HttpResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Preencha corretamente todos os campos obrigatórios da carteira.',
          fieldErrors,
        },
        { status: 422 }
      );
    }

    const db = getDb();
    const existingIdx = db.wallets.findIndex(
      (w) => w.userId === user.id && w.kind === body.kind
    );

    const updatedWallet = {
      id: existingIdx >= 0 ? db.wallets[existingIdx].id : `wallet-${user.id}-${body.kind}-${Date.now()}`,
      userId: user.id,
      kind: body.kind,
      displayName: body.displayName.trim(),
      nickname: body.nickname.trim(),
      network: body.network,
      profileName: body.profileName.trim(),
      address: body.address.trim(),
      secondaryAddressOrEns: body.secondaryAddressOrEns?.trim() || '',
      walletType: body.walletType,
      referralCode: body.referralCode.trim(),
      email: body.email.trim(),
      ensDomain: body.ensDomain || '.eth',
      ensName: body.ensName.trim(),
      sameAsPrimary: body.sameAsPrimary,
      isConnected: true,
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      db.wallets[existingIdx] = updatedWallet;
    } else {
      db.wallets.push(updatedWallet);
    }
    saveDb();

    const userWallets = db.wallets.filter((w) => w.userId === user.id);
    return HttpResponse.json({ wallet: updatedWallet, wallets: userWallets });
  }),
];

export const handlers = [...restHandlers, ...socketHandlers];

