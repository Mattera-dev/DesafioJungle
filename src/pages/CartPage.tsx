import React, { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  AlertTriangle,
  ChevronLeft,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import {
  useAcknowledgeCartMutation,
  useApplyCouponMutation,
  useCartQuery,
  useNftsQuery,
  useRemoveCartItemMutation,
  useRemoveCouponMutation,
  useUpdateCartItemMutation,
} from '@/hooks/useQueries';
import { CartSummarySkeleton } from '@/components/ui/Skeleton';
import { mulEth } from '@/lib/eth';
import { useAuth } from '@/contexts/AuthContext';
import { extractApiError } from '@/services/api';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, openAuthModal } = useAuth();

  const { data: cart, isLoading } = useCartQuery();
  const { data: catalogData } = useNftsQuery({ page: 1, limit: 6 });

  const updateItemMutation = useUpdateCartItemMutation();
  const removeItemMutation = useRemoveCartItemMutation();
  const acknowledgeMutation = useAcknowledgeCartMutation();
  const applyCouponMutation = useApplyCouponMutation();
  const removeCouponMutation = useRemoveCouponMutation();

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);

  const items = cart?.items ?? [];
  const alsoViewed = (catalogData?.items ?? []).slice(0, 5);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    if (!couponInput.trim()) {
      setCouponError('Digite um código promocional.');
      return;
    }
    try {
      await applyCouponMutation.mutateAsync(couponInput.trim());
      setCouponInput('');
    } catch (err) {
      setCouponError(extractApiError(err).message);
    }
  };

  const handleProceedToCheckout = () => {
    if (!isAuthenticated) {
      openAuthModal('login', '/checkout');
      return;
    }
    navigate({ to: '/checkout' });
  };

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-8 pt-4 sm:pt-6">
      <div className="flex sm:hidden items-center justify-between mb-5 relative">
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => navigate({ to: '/' })}
          className="w-10 h-10 rounded-full bg-[#21160F] border border-[#3C281B] text-[#CF8A49] flex items-center justify-center z-10"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="absolute inset-0 flex items-center justify-center text-base font-extrabold text-[#F5EFEA] pointer-events-none">
          Carrinho de NFTs
        </h1>
        <div className="w-10" />
      </div>

      <nav aria-label="Breadcrumb" className="hidden sm:block text-xs text-[#D7C7B8] mb-6">
        <Link to="/" className="hover:text-[#CF8A49]">
          Início
        </Link>
        <span className="mx-2 text-[#7B695B]">/</span>
        <Link to="/" hash="catalogo" className="hover:text-[#CF8A49]">
          Mercado
        </Link>
        <span className="mx-2 text-[#7B695B]">/</span>
        <span className="text-[#F5EFEA] font-semibold">Carrinho</span>
      </nav>

      {cart?.hasOutdatedItems && (
        <div
          role="alert"
          data-testid="cart-outdated-banner"
          className="mb-6 p-4 rounded-lg bg-[#2B1B10] border border-[#CF8A49] flex flex-wrap items-center justify-between gap-4 text-xs"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[#CF8A49] shrink-0" />
            <div>
              <p className="font-bold text-[#F5EFEA]">
                Alteração de preço ou disponibilidade detectada em tempo real
              </p>
              <p className="text-[#D7C7B8] mt-0.5">
                Um ou mais itens do seu carrinho tiveram seus valores ou estoque atualizados. Revise e confirme os novos valores.
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="cart-acknowledge-button"
            onClick={() => acknowledgeMutation.mutate()}
            className="px-4 h-8 bg-[#CF8A49] hover:bg-[#DF9B5A] text-[#130D09] font-extrabold rounded"
          >
            Confirmar novos valores
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-14">
          <div className="lg:col-span-8 flex flex-col gap-3">
            <CartSummarySkeleton />
          </div>
          <div className="lg:col-span-4">
            <CartSummarySkeleton />
          </div>
        </div>
      ) : items.length === 0 ? (
        <div
          data-testid="cart-empty-state"
          className="bg-[#1F150F] border border-[#3C281B] rounded-xl p-12 text-center mb-14 flex flex-col items-center gap-4"
        >
          <ShoppingBag className="w-10 h-10 text-[#CF8A49]" />
          <h2 className="text-base font-extrabold text-[#F5EFEA]">
            Seu carrinho de NFTs está vazio
          </h2>
          <p className="text-xs text-[#A89688] max-w-md">
            Explore o catálogo da Kurio para adicionar colecionáveis digitais verificados ao seu carrinho.
          </p>
          <Link
            to="/"
            data-testid="cart-empty-explore"
            className="mt-2 inline-flex items-center justify-center px-6 h-10 bg-[#CF8A49] hover:bg-[#DF9B5A] text-[#130D09] text-xs font-extrabold rounded-full sm:rounded"
          >
            Continuar explorando
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 mb-14 items-start">
          <div className="lg:col-span-8">
            <div className="hidden sm:grid sm:grid-cols-12 text-xs font-bold text-[#F5EFEA] pb-3 border-b border-[#3C281B] px-3">
              <div className="col-span-5">NFTs</div>
              <div className="col-span-2 text-center">Preço</div>
              <div className="col-span-2 text-center">Edições</div>
              <div className="col-span-2 text-right">Total</div>
              <div className="col-span-1" />
            </div>

            <div className="flex flex-col gap-3.5 sm:mt-3">
              {items.map((item) => {
                const lineTotal = mulEth(item.unitPriceEth, item.quantity);
                return (
                  <div
                    key={item.id}
                    data-testid={`cart-item-${item.nftId}`}
                    className={`bg-[#21160F] sm:bg-[#1F150F] border rounded-2xl sm:rounded-lg p-0 sm:p-3.5 overflow-hidden flex sm:grid sm:grid-cols-12 gap-3 sm:gap-4 items-center text-xs ${
                      item.priceChanged || item.availabilityChanged
                        ? 'border-[#CF8A49]'
                        : 'border-[#2C1D13]'
                    }`}
                  >
                    <div className="flex-1 sm:col-span-5 flex items-center gap-3.5 min-w-0">
                      <Link
                        to="/nft/$nftId"
                        params={{ nftId: item.nftId }}
                        className="w-24 h-24 sm:w-14 sm:h-14 sm:rounded-lg overflow-hidden bg-[#E5DEC9] shrink-0"
                      >
                        <img
                          src={item.nft.image}
                          alt={item.nft.name}
                          width={96}
                          height={96}
                          className="w-full h-full object-cover"
                        />
                      </Link>
                      <div className="min-w-0 py-2 sm:py-0">
                        <Link
                          to="/nft/$nftId"
                          params={{ nftId: item.nftId }}
                          className="font-extrabold text-sm sm:text-xs text-[#F5EFEA] hover:text-[#CF8A49] block truncate"
                        >
                          {item.nft.name}
                        </Link>
                        <p className="hidden sm:block text-[11px] text-[#7B695B] mt-0.5">
                          ID do token: {item.nft.tokenId} ({item.edition})
                        </p>
                        <p className="sm:hidden text-xs text-[#A89688] mt-0.5">
                          Edição: {item.edition}
                        </p>
                        <p className="sm:hidden text-sm font-extrabold text-[#CF8A49] mt-2">
                          {lineTotal} ETH
                        </p>
                        {item.priceChanged && (
                          <p
                            data-testid={`price-changed-badge-${item.nftId}`}
                            className="text-[10px] text-[#CF8A49] font-semibold mt-0.5"
                          >
                            Preço atualizado (anterior: {item.previousPriceEth} ETH)
                          </p>
                        )}
                        {item.availabilityChanged && (
                          <p className="text-[10px] text-[#E05844] font-semibold mt-0.5">
                            Disponível: {item.available} un.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="hidden sm:block sm:col-span-2 sm:text-center">
                      <span
                        data-testid={`cart-item-unit-price-${item.nftId}`}
                        className="font-bold text-[#D7C7B8]"
                      >
                        {item.unitPriceEth} ETH
                      </span>
                    </div>

                    <div className="pr-3 sm:pr-0 sm:col-span-2 flex items-center justify-center gap-2">
                      <div className="inline-flex items-center gap-2 sm:gap-2.5">
                        <button
                          type="button"
                          data-testid={`cart-qty-decrease-${item.nftId}`}
                          aria-label={`Diminuir quantidade de ${item.nft.name}`}
                          disabled={updateItemMutation.isPending}
                          onClick={() =>
                            updateItemMutation.mutate({
                              itemId: item.id,
                              quantity: item.quantity - 1,
                            })
                          }
                          className="w-7 h-7 sm:w-7 sm:h-7 rounded-full sm:rounded-md bg-[#2C1D13] sm:bg-[#CF8A49] hover:bg-[#DF9B5A] text-[#CF8A49] sm:text-[#130D09] font-extrabold flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5 sm:w-3.5 sm:h-3.5" />
                        </button>
                        <span
                          data-testid={`cart-qty-value-${item.nftId}`}
                          className="w-5 text-center font-bold text-[#F5EFEA]"
                        >
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          data-testid={`cart-qty-increase-${item.nftId}`}
                          aria-label={`Aumentar quantidade de ${item.nft.name}`}
                          disabled={
                            item.quantity >= item.available ||
                            updateItemMutation.isPending
                          }
                          onClick={() =>
                            updateItemMutation.mutate({
                              itemId: item.id,
                              quantity: item.quantity + 1,
                            })
                          }
                          className="w-7 h-7 sm:w-7 sm:h-7 rounded-full sm:rounded-md bg-[#2C1D13] sm:bg-[#CF8A49] hover:bg-[#DF9B5A] disabled:opacity-35 disabled:cursor-not-allowed text-[#F5EFEA] sm:text-[#130D09] font-extrabold flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        aria-label={`Remover ${item.nft.name}`}
                        onClick={() => removeItemMutation.mutate(item.id)}
                        className="sm:hidden p-1.5 text-[#CF8A49] hover:text-[#E05844]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="hidden sm:block sm:col-span-2 sm:text-right">
                      <span
                        data-testid={`cart-item-total-${item.nftId}`}
                        className="font-extrabold text-[#CF8A49]"
                      >
                        {lineTotal} ETH
                      </span>
                    </div>

                    <div className="hidden sm:flex sm:col-span-1 justify-end">
                      <button
                        type="button"
                        data-testid={`cart-remove-${item.nftId}`}
                        aria-label={`Remover ${item.nft.name} do carrinho`}
                        onClick={() => removeItemMutation.mutate(item.id)}
                        className="p-1.5 text-[#A89688] hover:text-[#E05844] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside
            aria-label="Resumo da carteira"
            className="lg:col-span-4 bg-[#21160F] sm:bg-transparent border border-[#3C281B] sm:border-0 rounded-3xl sm:rounded-none p-5 sm:p-0 flex flex-col gap-4"
          >
            <h2 className="hidden sm:block text-sm font-bold text-[#F5EFEA] pb-3 border-b border-[#3C281B]">
              Resumo da carteira
            </h2>

            <div>
              <label
                htmlFor="cart-coupon-input"
                className="hidden sm:block text-xs font-bold text-[#F5EFEA] mb-2"
              >
                Código promocional
              </label>
              <form
                onSubmit={handleApplyCoupon}
                className="flex w-full rounded-full sm:rounded overflow-hidden border border-[#3C281B] bg-[#18100B] sm:bg-transparent sm:border-0 p-1 sm:p-0"
              >
                <input
                  id="cart-coupon-input"
                  data-testid="cart-coupon-input"
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Digite o código promocional..."
                  className="flex-1 min-w-0 h-10 sm:h-9 px-3.5 sm:px-3 bg-transparent sm:bg-[#130D09] sm:border sm:border-[#3C281B] sm:rounded-l text-xs text-[#F5EFEA] placeholder-[#8E7A6B]"
                />
                <button
                  type="submit"
                  data-testid="cart-coupon-apply"
                  disabled={applyCouponMutation.isPending}
                  className="px-5 sm:px-4 h-10 sm:h-9 bg-gradient-to-b from-[#CF8A49] to-[#9A622D] sm:bg-none sm:bg-[#CF8A49] hover:bg-[#DF9B5A] text-[#F5EFEA] sm:text-[#130D09] text-xs font-bold rounded-full sm:rounded-none sm:rounded-r transition-colors"
                >
                  Aplicar
                </button>
              </form>

              {couponError && (
                <p
                  role="alert"
                  data-testid="cart-coupon-error"
                  className="text-[11px] text-[#E05844] mt-1.5"
                >
                  {couponError}
                </p>
              )}

              {cart?.couponCode && (
                <div
                  data-testid="cart-active-coupon"
                  className="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#261A12] border border-[#CF8A49] text-[11px] text-[#CF8A49]"
                >
                  <span>Cupom ativo: {cart.couponCode}</span>
                  <button
                    type="button"
                    data-testid="cart-coupon-remove"
                    aria-label="Remover cupom"
                    onClick={() => removeCouponMutation.mutate()}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5 text-xs pt-2">
              <div className="flex items-center justify-between text-[#D7C7B8]">
                <span>Subtotal</span>
                <span data-testid="cart-subtotal" className="font-bold text-[#F5EFEA]">
                  {cart?.subtotalEth} ETH
                </span>
              </div>

              <div className="flex items-center justify-between text-[#D7C7B8]">
                <span>Desconto do lançamento</span>
                <span data-testid="cart-discount">
                  (-) {cart?.discountEth === '0.00' ? '00.00' : `${cart?.discountEth} ETH`}
                </span>
              </div>

              <div className="flex items-center justify-between text-[#D7C7B8]">
                <span>Taxa de rede</span>
                <span data-testid="cart-network-fee" className="font-bold text-[#F5EFEA]">
                  {cart?.networkFeeEth} ETH
                </span>
              </div>
              <div className="text-right text-[10px] text-[#CF8A49] -mt-1.5">
                Taxa estimada
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#3C281B] text-sm font-extrabold">
                <span className="text-[#F5EFEA]">Total</span>
                <span data-testid="cart-total" className="text-[#CF8A49]">
                  {cart?.totalEth} ETH
                </span>
              </div>
            </div>

            <button
              type="button"
              data-testid="cart-checkout-button"
              onClick={handleProceedToCheckout}
              className="mt-2 w-full h-12 sm:h-10 bg-[#CF8A49] hover:bg-[#DF9B5A] text-[#130D09] text-xs font-extrabold rounded-full sm:rounded transition-colors"
            >
              Conectar e finalizar
            </button>

            <Link
              to="/"
              className="hidden sm:block text-center text-xs text-[#CF8A49] hover:underline py-1"
            >
              Continuar explorando
            </Link>
          </aside>
        </div>
      )}

      <section aria-label="Colecionadores também viram" className="mb-10">
        <div className="border-b border-[#3C281B] pb-2.5 mb-6">
          <h2 className="text-xs font-bold text-[#CF8A49]">
            Colecionadores também viram
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
          {alsoViewed.map((item) => (
            <Link
              key={item.id}
              to="/nft/$nftId"
              params={{ nftId: item.id }}
              className="group bg-[#1F150F] border border-[#2C1D13] hover:border-[#CF8A49] rounded-lg p-3 transition-all flex flex-col"
            >
              <div className="aspect-square rounded-lg overflow-hidden bg-[#E5DEC9] mb-2.5">
                <img
                  src={item.image}
                  alt={item.name}
                  width={180}
                  height={180}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <h3 className="text-[11px] font-bold text-[#F5EFEA] group-hover:text-[#CF8A49] truncate">
                {item.name}
              </h3>
              <span className="text-[11px] font-extrabold text-[#CF8A49] mt-0.5">
                {item.priceEth} ETH
              </span>
            </Link>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 mt-6">
          <span className="w-2 h-2 rounded-full border border-[#CF8A49]" />
          <span className="w-2 h-2 rounded-full bg-[#CF8A49]" />
          <span className="w-2 h-2 rounded-full border border-[#CF8A49]" />
        </div>
      </section>
    </main>
  );
};
