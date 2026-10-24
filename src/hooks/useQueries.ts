import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChangePasswordPayload,
  CreateOrderPayload,
  NFT,
  NFTEditionType,
  NFTListParams,
  UpdateProfilePayload,
  UpsertWalletPayload,
} from '@/types/contracts';
import { api, extractApiError } from '@/services/api';
import { queryKeys } from '@/services/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export function useNftsQuery(params: NFTListParams) {
  return useQuery({
    queryKey: queryKeys.nfts(params),
    queryFn: ({ signal }) => api.listNfts(params, signal),
  });
}

export function useNftDetailQuery(nftId: string) {
  return useQuery({
    queryKey: queryKeys.nftDetail(nftId),
    queryFn: ({ signal }) => api.getNftById(nftId, signal),
    enabled: Boolean(nftId),
  });
}

export function useFavoritesQuery() {
  const { user, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.favorites(user?.id ?? null),
    queryFn: ({ signal }) => api.getFavorites(signal),
    enabled: isAuthenticated && Boolean(user?.id),
  });
}

export function useToggleFavoriteMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const userId = user?.id ?? null;

  return useMutation({
    mutationFn: async ({ nft, isFavorite }: { nft: NFT; isFavorite: boolean }) => {
      if (isFavorite) {
        return api.removeFavorite(nft.id);
      }
      return api.addFavorite(nft.id);
    },

    onMutate: async ({ nft, isFavorite }) => {
      if (!userId) return { previous: undefined };
      const favKey = queryKeys.favorites(userId);
      await queryClient.cancelQueries({ queryKey: favKey });

      const previous = queryClient.getQueryData<{ ids: string[]; items: NFT[] }>(favKey);

      queryClient.setQueryData<{ ids: string[]; items: NFT[] }>(favKey, (old) => {
        const currentIds = old?.ids ?? [];
        const currentItems = old?.items ?? [];
        if (isFavorite) {
          return {
            ids: currentIds.filter((id) => id !== nft.id),
            items: currentItems.filter((item) => item.id !== nft.id),
          };
        }
        return {
          ids: [...currentIds, nft.id],
          items: [...currentItems, nft],
        };
      });

      return { previous };
    },
    onError: (err, _variables, context) => {
      if (userId && context?.previous) {
        queryClient.setQueryData(queryKeys.favorites(userId), context.previous);
      }
      const apiErr = extractApiError(err);
      toast({
        title: 'Erro ao atualizar favoritos',
        description: apiErr.message,
        variant: 'error',
      });
    },
    onSuccess: (_data, { nft, isFavorite }) => {
      toast({
        title: isFavorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos',
        description: `${nft.name} foi ${isFavorite ? 'removido da' : 'salvo na'} sua lista de interesse.`,
        variant: 'success',
      });
    },
    onSettled: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.favorites(userId) });
      }
    },
  });
}

export function useCartQuery() {
  const { user } = useAuth();
  const ownerKey = user?.id ?? 'guest';
  return useQuery({
    queryKey: queryKeys.cart(ownerKey),
    queryFn: ({ signal }) => api.getCart(signal),
  });
}

export function useAddCartItemMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const ownerKey = user?.id ?? 'guest';

  return useMutation({
    mutationFn: (payload: { nftId: string; edition: NFTEditionType; quantity: number }) =>
      api.addCartItem(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.cart(ownerKey), data);
      queryClient.invalidateQueries({ queryKey: ['quote', ownerKey] });
      toast({
        title: 'Adicionado ao carrinho',
        description: 'O NFT foi incluído no seu carrinho.',
        variant: 'success',
      });
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      toast({
        title: 'Não foi possível adicionar ao carrinho',
        description: apiErr.message,
        variant: 'error',
      });
    },
  });
}

export function useUpdateCartItemMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const ownerKey = user?.id ?? 'guest';

  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      api.updateCartItem(itemId, quantity),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.cart(ownerKey), data);
      queryClient.invalidateQueries({ queryKey: ['quote', ownerKey] });
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      toast({
        title: 'Erro ao atualizar quantidade',
        description: apiErr.message,
        variant: 'error',
      });
    },
  });
}

export function useRemoveCartItemMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const ownerKey = user?.id ?? 'guest';

  return useMutation({
    mutationFn: (itemId: string) => api.removeCartItem(itemId),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.cart(ownerKey), data);
      queryClient.invalidateQueries({ queryKey: ['quote', ownerKey] });
      toast({
        title: 'Item removido',
        description: 'O NFT foi removido do carrinho.',
      });
    },
  });
}

export function useAcknowledgeCartMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const ownerKey = user?.id ?? 'guest';

  return useMutation({
    mutationFn: () => api.acknowledgeCartChanges(),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.cart(ownerKey), data);
      queryClient.invalidateQueries({ queryKey: ['quote', ownerKey] });
      toast({
        title: 'Cotação atualizada',
        description: 'Você confirmou os novos valores e disponibilidades do carrinho.',
        variant: 'success',
      });
    },
  });
}

export function useApplyCouponMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const ownerKey = user?.id ?? 'guest';

  return useMutation({
    mutationFn: (couponCode: string) => api.getQuote(couponCode),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart(ownerKey) });
      if (data.couponCode) {
        toast({
          title: 'Cupom aplicado',
          description: `Cupom ${data.couponCode} aplicado com sucesso (-${data.discountEth} ETH).`,
          variant: 'success',
        });
      }
    },
  });
}

export function useRemoveCouponMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const ownerKey = user?.id ?? 'guest';

  return useMutation({
    mutationFn: () => api.removeCoupon(),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.cart(ownerKey), data);
      toast({
        title: 'Cupom removido',
        description: 'O código promocional foi removido do resumo.',
      });
    },
  });
}

export function useWalletsQuery() {
  const { user, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.wallets(user?.id ?? null),
    queryFn: ({ signal }) => api.getWallets(signal),
    enabled: isAuthenticated && Boolean(user?.id),
  });
}

export function useUpsertWalletMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (payload: UpsertWalletPayload) => api.upsertWallet(payload),
    onSuccess: (data) => {
      if (user?.id) {
        queryClient.setQueryData(queryKeys.wallets(user.id), { wallets: data.wallets });
      }
    },
  });
}

export function useProfileQuery() {
  const { user, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.profile(user?.id ?? null),
    queryFn: ({ signal }) => api.getProfile(signal),
    enabled: isAuthenticated && Boolean(user?.id),
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  const { user, refreshUser } = useAuth();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => api.updateProfile(payload),
    onSuccess: (data) => {
      refreshUser(data.user);
      if (user?.id) {
        queryClient.setQueryData(queryKeys.profile(user.id), data);
      }
    },
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => api.changePassword(payload),
  });
}

export function useCreateOrderMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => api.createOrder(payload),
    onSuccess: (data) => {
      if (user?.id) {
        queryClient.setQueryData(queryKeys.orderDetail(user.id, data.order.id), data);
        queryClient.invalidateQueries({ queryKey: queryKeys.orders(user.id) });
      }
    },
  });
}

export function useOrderDetailQuery(orderId: string) {
  const { user, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.orderDetail(user?.id ?? null, orderId),
    queryFn: ({ signal }) => api.getOrderById(orderId, signal),
    enabled: isAuthenticated && Boolean(user?.id) && Boolean(orderId),
    refetchInterval: (query) => {
      const status = query.state.data?.order?.status;
      return status === 'pending' ? 1000 : false;
    },
  });
}

export function useOrdersQuery() {
  const { user, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.orders(user?.id ?? null),
    queryFn: ({ signal }) => api.listOrders(signal),
    enabled: isAuthenticated && Boolean(user?.id),
  });
}

