export type NFTEditionType = '1/1' | '1/10' | '1/50' | 'ABERTA';

export type WalletNetwork = 'Ethereum' | 'Polygon' | 'Solana';

export type WalletType = 'MetaMask' | 'Coinbase Wallet' | 'WalletConnect';

export type NFTCategory =
  | 'Arte digital'
  | 'Fotografia'
  | 'Música'
  | 'Arte 3D'
  | 'Colecionáveis'
  | 'Generativa'
  | 'Jogos'
  | 'Avatares'
  | 'Utilidade';

export interface NFTEdition {
  type: NFTEditionType;
  priceEth: string;
  available: number;
  total: number;
}

export interface NFTReview {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  comment: string;
  date: string;
}

export interface NFT {
  id: string;
  name: string;
  tokenId: string;
  collection: string;
  category: NFTCategory;
  network: WalletNetwork;
  priceEth: string;
  originalPriceEth?: string;
  image: string;
  gallery: string[];
  shortDescription: string;
  fullDescription: string[];
  networkDetails: string;
  contractDetails: string;
  copyrightDetails: string;
  attributes: string[];
  rating: number;
  reviewCount: number;
  reviews: NFTReview[];
  editions: NFTEdition[];
  isNewRelease?: boolean;
  isTrending?: boolean;
  isFeatured?: boolean;
  createdAt: string;
  version: number;
}

export type SortOption = 'recent' | 'price_asc' | 'price_desc' | 'popular';
export type CatalogTab = 'all' | 'new' | 'trending';

export interface NFTListParams {
  q?: string;
  categories?: NFTCategory[];
  networks?: WalletNetwork[];
  minPrice?: string;
  maxPrice?: string;
  tab?: CatalogTab;
  sort?: SortOption;
  page?: number;
  limit?: number;
}

export interface NFTListResponse {
  items: NFT[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  facets: {
    categories: Record<string, number>;
    networks: Record<string, number>;
  };
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  bio: string;
  phone: string;
  profileName: string;
  referralCode: string;
  ensName: string;
  ensDomain: string;
  createdAt: string;
}

export interface SessionResponse {
  user: User;
  token: string;
  expiresAt: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface UpdateProfilePayload {
  name: string;
  username: string;
  email: string;
  bio?: string;
  phone?: string;
  avatar?: string;
  profileName?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface Wallet {
  id: string;
  userId: string;
  kind: 'primary' | 'secondary';
  displayName: string;
  nickname: string;
  network: WalletNetwork;
  profileName: string;
  address: string;
  secondaryAddressOrEns?: string;
  walletType: WalletType;
  referralCode: string;
  email: string;
  ensDomain: string;
  ensName: string;
  sameAsPrimary?: boolean;
  isConnected: boolean;
  updatedAt: string;
}

export interface UpsertWalletPayload {
  kind: 'primary' | 'secondary';
  displayName: string;
  nickname: string;
  network: WalletNetwork;
  profileName: string;
  address: string;
  secondaryAddressOrEns?: string;
  walletType: WalletType;
  referralCode: string;
  email: string;
  ensDomain: string;
  ensName: string;
  sameAsPrimary?: boolean;
}

export interface CartItem {
  id: string;
  nftId: string;
  edition: NFTEditionType;
  quantity: number;
  unitPriceEth: string;
  available: number;
  nft: {
    id: string;
    name: string;
    tokenId: string;
    image: string;
    collection: string;
    network: WalletNetwork;
    version: number;
  };
  priceChanged?: boolean;
  previousPriceEth?: string;
  availabilityChanged?: boolean;
}

export interface CartResponse {
  items: CartItem[];
  couponCode: string | null;
  subtotalEth: string;
  discountEth: string;
  networkFeeEth: string;
  totalEth: string;
  quoteVersion: number;
  hasOutdatedItems: boolean;
}

export interface QuoteResponse {
  subtotalEth: string;
  discountEth: string;
  networkFeeEth: string;
  totalEth: string;
  couponCode: string | null;
  couponDescription?: string;
  quoteVersion: number;
  valid: boolean;
  changes?: {
    nftId: string;
    name: string;
    oldPriceEth?: string;
    newPriceEth?: string;
    oldAvailable?: number;
    newAvailable?: number;
  }[];
}

export type OrderStatus = 'pending' | 'confirmed' | 'rejected';

export interface OrderItemSnapshot {
  nftId: string;
  name: string;
  tokenId: string;
  image: string;
  edition: NFTEditionType;
  quantity: number;
  unitPriceEth: string;
  lineTotalEth: string;
}

export interface CollectorCheckoutForm {
  displayName: string;
  username: string;
  network: WalletNetwork;
  profileName: string;
  walletAddress: string;
  secondaryWalletOrEns?: string;
  walletType: WalletType;
  referralCode: string;
  email: string;
  ensDomain: string;
  ensName: string;
  useAnotherWallet: boolean;
  notes?: string;
  selectedWalletOption: 'saved' | 'metamask' | 'coinbase';
}

export interface CreateOrderPayload {
  idempotencyKey: string;
  items: {
    nftId: string;
    edition: NFTEditionType;
    quantity: number;
    expectedUnitPriceEth: string;
  }[];
  couponCode?: string | null;
  expectedTotalEth: string;
  collector: CollectorCheckoutForm;
}

export interface Order {
  id: string;
  userId: string;
  idempotencyKey: string;
  status: OrderStatus;
  transactionHash: string;
  explorerUrl: string;
  network: WalletNetwork;
  walletType: WalletType;
  walletAddress: string;
  collector: CollectorCheckoutForm;
  items: OrderItemSnapshot[];
  couponCode: string | null;
  subtotalEth: string;
  discountEth: string;
  networkFeeEth: string;
  totalEth: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface NFTUpdatedEventPayload {
  eventId: string;
  resourceId: string;
  version: number;
  timestamp: string;
  priceEth: string;
  editions: NFTEdition[];
}

export interface OrderUpdatedEventPayload {
  eventId: string;
  resourceId: string;
  userId: string;
  version: number;
  timestamp: string;
  status: OrderStatus;
  transactionHash: string;
  failureReason?: string;
}

export type MockScenario =
  | 'default'
  | 'empty'
  | 'slow'
  | 'out-of-order'
  | 'network-error'
  | 'http-500'
  | 'session-expired'
  | 'unauthorized'
  | 'conflict-register'
  | 'coupon-invalid'
  | 'coupon-expired'
  | 'price-changed'
  | 'edition-exhausted'
  | 'order-timeout'
  | 'payment-rejected'
  | 'payment-confirmed';

export interface ApiErrorResponse {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
  details?: unknown;
}

