import axios, { AxiosError } from 'axios';
import {
  ApiErrorResponse,
  CartResponse,
  ChangePasswordPayload,
  CreateOrderPayload,
  LoginPayload,
  NFT,
  NFTEditionType,
  NFTListParams,
  NFTListResponse,
  Order,
  QuoteResponse,
  RegisterPayload,
  SessionResponse,
  UpdateProfilePayload,
  UpsertWalletPayload,
  User,
  Wallet,
} from '@/types/contracts';
import { getStoredSession, setStoredSession } from './authStore';
import { getMockScenario } from '@/mocks/db';

export const httpClient = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

httpClient.interceptors.request.use((config) => {
  const session = getStoredSession();
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }
  const scenario = getMockScenario();
  if (scenario && scenario !== 'default') {
    config.headers['x-mock-scenario'] = scenario;
  }
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    const isAuthEndpoint =
      error.config?.url?.includes('/auth/login') ||
      error.config?.url?.includes('/auth/register');

    if (status === 401 && !isAuthEndpoint) {
      const hadSession = Boolean(getStoredSession());
      setStoredSession(null);
      if (typeof window !== 'undefined' && hadSession) {
        window.dispatchEvent(
          new CustomEvent('kurio:session-expired', {
            detail: {
              code: code || 'SESSION_EXPIRED',
              message:
                error.response?.data?.message ||
                'Sua sessão expirou. Faça login novamente para retomar de onde parou.',
            },
          })
        );
      }
    }
    return Promise.reject(error);
  }
);

export function extractApiError(error: unknown): ApiErrorResponse {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    if (data && data.message) {
      return data;
    }
    if (error.code === 'ECONNABORTED' || error.response?.status === 504) {
      return {
        code: 'TIMEOUT',
        message: 'A requisição excedeu o tempo limite. Tente novamente.',
      };
    }
    return {
      code: 'NETWORK_ERROR',
      message: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
    };
  }
  return {
    code: 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : 'Ocorreu um erro inesperado.',
  };
}

export const api = {

  login: async (payload: LoginPayload): Promise<SessionResponse> => {
    const { data } = await httpClient.post<SessionResponse>('/auth/login', payload);
    return data;
  },
  register: async (payload: RegisterPayload): Promise<SessionResponse> => {
    const { data } = await httpClient.post<SessionResponse>('/auth/register', payload);
    return data;
  },
  getSession: async (signal?: AbortSignal): Promise<SessionResponse> => {
    const { data } = await httpClient.get<SessionResponse>('/auth/session', { signal });
    return data;
  },
  logout: async (): Promise<void> => {
    await httpClient.post('/auth/logout');
  },
  expireSession: async (): Promise<void> => {
    await httpClient.post('/auth/expire');
  },

  listNfts: async (params: NFTListParams, signal?: AbortSignal): Promise<NFTListResponse> => {
    const query: Record<string, string | number | undefined> = {
      q: params.q || undefined,
      categories: params.categories?.length ? params.categories.join(',') : undefined,
      networks: params.networks?.length ? params.networks.join(',') : undefined,
      minPrice: params.minPrice || undefined,
      maxPrice: params.maxPrice || undefined,
      tab: params.tab || 'all',
      sort: params.sort || 'recent',
      page: params.page || 1,
      limit: params.limit || 9,
    };
    const { data } = await httpClient.get<NFTListResponse>('/nfts', {
      params: query,
      signal,
    });
    return data;
  },
  getNftById: async (
    id: string,
    signal?: AbortSignal
  ): Promise<{ nft: NFT; related: NFT[] }> => {
    const { data } = await httpClient.get<{ nft: NFT; related: NFT[] }>(`/nfts/${id}`, {
      signal,
    });
    return data;
  },

  getFavorites: async (
    signal?: AbortSignal
  ): Promise<{ ids: string[]; items: NFT[] }> => {
    const { data } = await httpClient.get<{ ids: string[]; items: NFT[] }>('/favorites', {
      signal,
    });
    return data;
  },
  addFavorite: async (nftId: string): Promise<{ ids: string[] }> => {
    const { data } = await httpClient.post<{ ids: string[] }>(`/favorites/${nftId}`);
    return data;
  },
  removeFavorite: async (nftId: string): Promise<{ ids: string[] }> => {
    const { data } = await httpClient.delete<{ ids: string[] }>(`/favorites/${nftId}`);
    return data;
  },

  getCart: async (signal?: AbortSignal): Promise<CartResponse> => {
    const { data } = await httpClient.get<CartResponse>('/cart', { signal });
    return data;
  },
  addCartItem: async (payload: {
    nftId: string;
    edition: NFTEditionType;
    quantity: number;
  }): Promise<CartResponse> => {
    const { data } = await httpClient.post<CartResponse>('/cart/items', payload);
    return data;
  },
  updateCartItem: async (itemId: string, quantity: number): Promise<CartResponse> => {
    const { data } = await httpClient.patch<CartResponse>(
      `/cart/items/${encodeURIComponent(itemId)}`,
      {
        quantity,
      }
    );
    return data;
  },
  removeCartItem: async (itemId: string): Promise<CartResponse> => {
    const { data } = await httpClient.delete<CartResponse>(
      `/cart/items/${encodeURIComponent(itemId)}`
    );
    return data;
  },
  acknowledgeCartChanges: async (): Promise<CartResponse> => {
    const { data } = await httpClient.post<CartResponse>('/cart/acknowledge');
    return data;
  },
  getQuote: async (couponCode?: string | null): Promise<QuoteResponse> => {
    const { data } = await httpClient.post<QuoteResponse>('/quote', { couponCode });
    return data;
  },
  removeCoupon: async (): Promise<CartResponse> => {
    const { data } = await httpClient.delete<CartResponse>('/cart/coupon');
    return data;
  },

  createOrder: async (payload: CreateOrderPayload): Promise<{ order: Order }> => {
    const { data } = await httpClient.post<{ order: Order }>('/orders', payload, {
      headers: {
        'Idempotency-Key': payload.idempotencyKey,
      },
    });
    return data;
  },
  getOrderById: async (id: string, signal?: AbortSignal): Promise<{ order: Order }> => {
    const { data } = await httpClient.get<{ order: Order }>(`/orders/${id}`, { signal });
    return data;
  },
  listOrders: async (signal?: AbortSignal): Promise<{ orders: Order[] }> => {
    const { data } = await httpClient.get<{ orders: Order[] }>('/orders', { signal });
    return data;
  },

  getProfile: async (signal?: AbortSignal): Promise<{ user: User }> => {
    const { data } = await httpClient.get<{ user: User }>('/profile', { signal });
    return data;
  },
  updateProfile: async (payload: UpdateProfilePayload): Promise<{ user: User }> => {
    const { data } = await httpClient.put<{ user: User }>('/profile', payload);
    return data;
  },
  changePassword: async (
    payload: ChangePasswordPayload
  ): Promise<{ ok: boolean; message: string }> => {
    const { data } = await httpClient.put<{ ok: boolean; message: string }>(
      '/profile/password',
      payload
    );
    return data;
  },

  getWallets: async (signal?: AbortSignal): Promise<{ wallets: Wallet[] }> => {
    const { data } = await httpClient.get<{ wallets: Wallet[] }>('/wallets', { signal });
    return data;
  },
  upsertWallet: async (
    payload: UpsertWalletPayload
  ): Promise<{ wallet: Wallet; wallets: Wallet[] }> => {
    const { data } = await httpClient.put<{ wallet: Wallet; wallets: Wallet[] }>(
      '/wallets',
      payload
    );
    return data;
  },
};

