import {
  CartItem,
  CartResponse,
  MockScenario,
  NFT,
  NFTEditionType,
  Order,
  Wallet,
} from '@/types/contracts';
import { addEth, mulEth, percentEth, subEth } from '@/lib/eth';
import {
  COUPONS,
  INITIAL_NFTS,
  INITIAL_USERS,
  INITIAL_WALLETS,
  MockUserRecord,
} from './fixtures';

const DB_STORAGE_KEY = 'kurio_mock_db_v1';
const SCENARIO_STORAGE_KEY = 'kurio_mock_scenario_v1';

export interface StoredCartItem {
  id: string;
  nftId: string;
  edition: NFTEditionType;
  quantity: number;
  addedUnitPriceEth: string;
  acknowledgedPriceEth: string;
}

export interface StoredCartState {
  items: StoredCartItem[];
  couponCode: string | null;
  quoteVersion: number;
}

export interface IdempotencyEntry {
  key: string;
  userId: string;
  payloadSignature: string;
  orderId: string;
}

export interface MockDatabaseState {
  nfts: NFT[];
  users: MockUserRecord[];
  sessions: Record<string, { userId: string; expiresAt: string }>;
  favoritesByUser: Record<string, string[]>;
  cartsByOwner: Record<string, StoredCartState>;
  wallets: Wallet[];
  orders: Order[];
  idempotencyEntries: Record<string, IdempotencyEntry>;
}

function createInitialDb(): MockDatabaseState {
  return {
    nfts: structuredClone(INITIAL_NFTS),
    users: structuredClone(INITIAL_USERS),
    sessions: {},
    favoritesByUser: {
      'user-1': ['emerald-ape-042', 'ivory-baron-088'],
      'user-2': ['sage-nomad-009'],
    },
    cartsByOwner: {
      guest: {
        items: [],
        couponCode: null,
        quoteVersion: 1,
      },
    },
    wallets: structuredClone(INITIAL_WALLETS),
    orders: [],
    idempotencyEntries: {},
  };
}

let memoryDb: MockDatabaseState | null = null;

export function getDb(): MockDatabaseState {
  if (memoryDb) return memoryDb;
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(DB_STORAGE_KEY) : null;
    if (raw) {
      memoryDb = JSON.parse(raw) as MockDatabaseState;
      return memoryDb;
    }
  } catch {
    void 0;
  }
  memoryDb = createInitialDb();
  saveDb();
  return memoryDb;
}

export function saveDb(): void {
  if (!memoryDb) return;
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(memoryDb));
    }
  } catch {
    void 0;
  }
}

export function resetMockDb(): MockDatabaseState {
  memoryDb = createInitialDb();
  saveDb();
  setMockScenario('default');
  return memoryDb;
}

export function getMockScenario(): MockScenario {
  try {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const fromUrl = urlParams.get('__scenario') as MockScenario | null;
      if (fromUrl) return fromUrl;
      const stored = window.localStorage.getItem(SCENARIO_STORAGE_KEY) as MockScenario | null;
      if (stored) return stored;
    }
  } catch {
    void 0;
  }
  return 'default';
}

export function setMockScenario(scenario: MockScenario): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SCENARIO_STORAGE_KEY, scenario);
      window.dispatchEvent(new CustomEvent('kurio:scenario-changed', { detail: scenario }));
    }
  } catch {
    void 0;
  }
}

export function getCartForOwner(ownerKey: string): StoredCartState {
  const db = getDb();
  if (!db.cartsByOwner[ownerKey]) {
    db.cartsByOwner[ownerKey] = {
      items: [],
      couponCode: null,
      quoteVersion: 1,
    };
    saveDb();
  }
  return db.cartsByOwner[ownerKey];
}

export function mergeGuestCartIntoUser(userId: string): void {
  const db = getDb();
  const guestCart = db.cartsByOwner['guest'];
  if (!guestCart || guestCart.items.length === 0) return;

  const userCart = getCartForOwner(userId);
  for (const guestItem of guestCart.items) {
    const nft = db.nfts.find((n) => n.id === guestItem.nftId);
    const editionObj = nft?.editions.find((e) => e.type === guestItem.edition);
    const maxAvail = editionObj ? editionObj.available : guestItem.quantity;

    const existing = userCart.items.find(
      (i) => i.nftId === guestItem.nftId && i.edition === guestItem.edition
    );
    if (existing) {
      existing.quantity = Math.min(maxAvail, existing.quantity + guestItem.quantity);
    } else if (maxAvail > 0) {
      userCart.items.push({
        ...guestItem,
        id: `${userId}-${guestItem.nftId}-${guestItem.edition.replace('/', '_')}`,
        quantity: Math.min(maxAvail, guestItem.quantity),
      });
    }
  }
  if (guestCart.couponCode && !userCart.couponCode) {
    userCart.couponCode = guestCart.couponCode;
  }
  userCart.quoteVersion += 1;
  db.cartsByOwner['guest'] = { items: [], couponCode: null, quoteVersion: 1 };
  saveDb();
}

export function computeCartResponse(ownerKey: string): CartResponse {
  const db = getDb();
  const cart = getCartForOwner(ownerKey);

  let subtotalEth = '0.00';
  let hasOutdatedItems = false;

  const enrichedItems: CartItem[] = cart.items
    .map((item) => {
      const nft = db.nfts.find((n) => n.id === item.nftId);
      if (!nft) return null;
      const editionObj =
        nft.editions.find((e) => e.type === item.edition) || nft.editions[0];
      const currentUnitPrice = editionObj.priceEth || nft.priceEth;
      const priceChanged = currentUnitPrice !== item.acknowledgedPriceEth;
      const availabilityChanged = editionObj.available < item.quantity;

      if (priceChanged || availabilityChanged) {
        hasOutdatedItems = true;
      }

      const lineTotal = mulEth(currentUnitPrice, item.quantity);
      subtotalEth = addEth(subtotalEth, lineTotal);

      return {
        id: item.id,
        nftId: nft.id,
        edition: item.edition,
        quantity: item.quantity,
        unitPriceEth: currentUnitPrice,
        available: editionObj.available,
        priceChanged,
        previousPriceEth: priceChanged ? item.acknowledgedPriceEth : undefined,
        availabilityChanged,
        nft: {
          id: nft.id,
          name: nft.name,
          tokenId: nft.tokenId,
          image: nft.image,
          collection: nft.collection,
          network: nft.network,
          version: nft.version,
        },
      };
    })
    .filter(Boolean) as CartItem[];

  let discountEth = '0.00';
  if (cart.couponCode) {
    const coupon = COUPONS[cart.couponCode.toUpperCase()];
    if (coupon && !coupon.expired) {
      if (coupon.type === 'percent') {
        discountEth = percentEth(subtotalEth, coupon.value);
      } else {
        discountEth = coupon.value.toFixed(2);
      }
    }
  }

  const networkFeeEth = enrichedItems.length > 0 ? '0.016' : '0.00';
  const afterDiscount = subEth(subtotalEth, discountEth);
  const totalEth = enrichedItems.length > 0 ? addEth(afterDiscount, networkFeeEth) : '0.00';

  return {
    items: enrichedItems,
    couponCode: cart.couponCode,
    subtotalEth,
    discountEth,
    networkFeeEth,
    totalEth,
    quoteVersion: cart.quoteVersion,
    hasOutdatedItems,
  };
}

