import { QueryClient } from '@tanstack/react-query';
import { NFTListParams } from '@/types/contracts';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 5,
      retry: (failureCount, error: any) => {
        const status = error?.response?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

export const queryKeys = {
  session: (token: string | null) => ['session', token] as const,
  nfts: (params: NFTListParams) => ['nfts', params] as const,
  nftDetail: (id: string) => ['nft', id] as const,
  favorites: (userId: string | null) => ['favorites', userId] as const,
  cart: (ownerKey: string) => ['cart', ownerKey] as const,
  quote: (ownerKey: string, couponCode?: string | null) =>
    ['quote', ownerKey, couponCode ?? null] as const,
  orders: (userId: string | null) => ['orders', userId] as const,
  orderDetail: (userId: string | null, orderId: string) =>
    ['order', userId, orderId] as const,
  profile: (userId: string | null) => ['profile', userId] as const,
  wallets: (userId: string | null) => ['wallets', userId] as const,
};

export function clearPrivateUserCache() {
  queryClient.removeQueries({ queryKey: ['favorites'] });
  queryClient.removeQueries({ queryKey: ['orders'] });
  queryClient.removeQueries({ queryKey: ['order'] });
  queryClient.removeQueries({ queryKey: ['profile'] });
  queryClient.removeQueries({ queryKey: ['wallets'] });
  queryClient.invalidateQueries({ queryKey: ['cart'] });
  queryClient.invalidateQueries({ queryKey: ['quote'] });
}

