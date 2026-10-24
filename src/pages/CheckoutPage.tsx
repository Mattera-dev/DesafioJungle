import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Info,
  Loader2,
  MoreVertical,
  RefreshCw,
  ShieldAlert,
  Wallet as WalletIcon,
} from 'lucide-react';
import {
  CollectorCheckoutForm,
  Order,
  WalletNetwork,
  WalletType,
} from '@/types/contracts';
import {
  useAcknowledgeCartMutation,
  useApplyCouponMutation,
  useCartQuery,
  useCreateOrderMutation,
  useOrderDetailQuery,
  useWalletsQuery,
} from '@/hooks/useQueries';
import { mulEth } from '@/lib/eth';
import { useAuth } from '@/contexts/AuthContext';
import { extractApiError } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

const PENDING_ORDER_STORAGE_KEY = 'kurio_active_checkout_order_v1';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { toast } = useToast();

  const { data: cart, isLoading: isCartLoading } = useCartQuery();
  const { data: walletsData } = useWalletsQuery();
  const acknowledgeMutation = useAcknowledgeCartMutation();
  const applyCouponMutation = useApplyCouponMutation();
  const createOrderMutation = useCreateOrderMutation();

  const primaryWallet = (walletsData?.wallets ?? []).find((w) => w.kind === 'primary');
  const secondaryWallet = (walletsData?.wallets ?? []).find((w) => w.kind === 'secondary');

  const [form, setForm] = useState<CollectorCheckoutForm>({
    displayName: user?.name || '',
    username: user?.username || '',
    network: 'Ethereum',
    profileName: user?.profileName || '',
    walletAddress: '0x71C95911E9a5D330f4D621842EC243EE1343292e',
    secondaryWalletOrEns: '',
    walletType: 'Coinbase Wallet',
    referralCode: user?.referralCode || 'KURIO-2026',
    email: user?.email || '',
    ensDomain: user?.ensDomain || '.eth',
    ensName: user?.ensName || '',
    useAnotherWallet: false,
    notes: '',
    selectedWalletOption: 'coinbase',
  });

  const [mobileWalletKind, setMobileWalletKind] = useState<'reserva' | 'principal'>(
    'reserva'
  );
  const [walletStatus, setWalletStatus] = useState<
    'connected' | 'disconnected' | 'rejected'
  >('connected');
  const [showCouponBox, setShowCouponBox] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [quoteConflictError, setQuoteConflictError] = useState<string | null>(null);

  const [activeOrderId, setActiveOrderId] = useState<string | null>(() => {
    try {
      const raw = window.sessionStorage.getItem(PENDING_ORDER_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { orderId?: string; userId?: string };
      if (parsed.userId === user?.id && parsed.orderId) return parsed.orderId;
      return null;
    } catch {
      return null;
    }
  });

  const idempotencyKeyRef = useRef<string>('');
  const isSubmittingLockRef = useRef<boolean>(false);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(PENDING_ORDER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as {
          idempotencyKey?: string;
          userId?: string;
        };
        if (parsed.userId === user?.id && parsed.idempotencyKey) {
          idempotencyKeyRef.current = parsed.idempotencyKey;
          return;
        }
      }
    } catch {
      void 0;
    }
    const freshKey = `idemp-${user?.id || 'anon'}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    idempotencyKeyRef.current = freshKey;
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const activeW = form.useAnotherWallet && secondaryWallet ? secondaryWallet : primaryWallet;
    setForm((prev) => ({
      ...prev,
      displayName: prev.displayName || activeW?.displayName || user.name,
      username: prev.username || user.username,
      network: activeW?.network || prev.network || 'Ethereum',
      profileName:
        prev.profileName ||
        activeW?.profileName ||
        user.profileName ||
        `${user.username}.Kurio`,
      walletAddress:
        activeW?.address ||
        prev.walletAddress ||
        '0x71C95911E9a5D330f4D621842EC243EE1343292e',
      secondaryWalletOrEns:
        activeW?.secondaryAddressOrEns ?? prev.secondaryWalletOrEns ?? '',
      walletType: activeW?.walletType || prev.walletType || 'Coinbase Wallet',
      referralCode:
        prev.referralCode || activeW?.referralCode || user.referralCode || 'KURIO-2026',
      email: prev.email || activeW?.email || user.email,
      ensDomain: activeW?.ensDomain || user.ensDomain || '.eth',
      ensName: prev.ensName || activeW?.ensName || user.ensName || user.username,
    }));
  }, [user, primaryWallet, secondaryWallet, form.useAnotherWallet]);

  const { data: activeOrderData } = useOrderDetailQuery(activeOrderId || '');
  const activeOrder: Order | undefined = activeOrderData?.order;

  useEffect(() => {
    if (!activeOrder) return;
    if (activeOrder.status === 'confirmed') {
      window.sessionStorage.removeItem(PENDING_ORDER_STORAGE_KEY);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['quote'] });
      queryClient.invalidateQueries({ queryKey: ['nfts'] });
      navigate({
        to: '/orders/$orderId',
        params: { orderId: activeOrder.id },
      });
    }
  }, [activeOrder, navigate, queryClient]);

  if (!isAuthenticated) {
    return (
      <main className="max-w-[1280px] mx-auto px-4 sm:px-8 pt-10 pb-16">
        <div
          data-testid="checkout-auth-required"
          className="bg-[#1F150F] border border-[#3C281B] rounded-xl p-10 text-center max-w-md mx-auto flex flex-col items-center gap-4"
        >
          <WalletIcon className="w-10 h-10 text-[#CF8A49]" />
          <h1 className="text-base font-extrabold text-[#F5EFEA]">
            Autenticação necessária para finalizar a compra
          </h1>
          <p className="text-xs text-[#A89688]">
            Faça login ou crie sua conta de colecionador para conectar sua carteira e confirmar seu pedido.
          </p>
          <button
            type="button"
            data-testid="checkout-login-trigger"
            onClick={() => openAuthModal('login', '/checkout')}
            className="px-6 h-10 bg-[#CF8A49] hover:bg-[#DF9B5A] text-[#130D09] text-xs font-extrabold rounded"
          >
            Entrar para continuar
          </button>
        </div>
      </main>
    );
  }

  const items = cart?.items ?? [];

  const handleFieldChange = <K extends keyof CollectorCheckoutForm>(
    key: K,
    val: CollectorCheckoutForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleAcknowledgeChanges = async () => {
    await acknowledgeMutation.mutateAsync();
    setQuoteConflictError(null);
    setSubmitError(null);
    idempotencyKeyRef.current = `idemp-${user?.id}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    if (!couponInput.trim()) return;
    try {
      await applyCouponMutation.mutateAsync(couponInput.trim());
      setCouponInput('');
      setShowCouponBox(false);
    } catch (err) {
      setCouponError(extractApiError(err).message);
    }
  };

  const handleResetRejectedOrder = () => {
    window.sessionStorage.removeItem(PENDING_ORDER_STORAGE_KEY);
    setActiveOrderId(null);
    setSubmitError(null);
    idempotencyKeyRef.current = `idemp-${user?.id}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
  };

  const handleConfirmPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingLockRef.current || createOrderMutation.isPending) {
      return;
    }

    setSubmitError(null);
    setQuoteConflictError(null);
    setFieldErrors({});

    if (walletStatus === 'disconnected') {
      setSubmitError(
        'Sua carteira está desconectada. Conecte sua carteira antes de confirmar a compra.'
      );
      return;
    }
    if (walletStatus === 'rejected') {
      setSubmitError(
        'A assinatura foi recusada na carteira selecionada. Autorize a conexão para prosseguir.'
      );
      return;
    }

    if (cart?.hasOutdatedItems) {
      setQuoteConflictError(
        'O preço ou a disponibilidade de um NFT mudou. Confirme a nova cotação antes de enviar o pedido.'
      );
      return;
    }

    const errors: Record<string, string> = {};
    if (!form.displayName.trim()) errors.displayName = 'Informe o nome de exibição.';
    if (!form.username.trim()) errors.username = 'Informe o nome de usuário.';
    if (!form.network) errors.network = 'Selecione uma rede.';
    if (!form.profileName.trim()) errors.profileName = 'Informe o nome do perfil.';
    if (!form.walletAddress.trim() || form.walletAddress.trim().length < 10) {
      errors.walletAddress = 'Informe um endereço de carteira válido (0x...).';
    }
    if (!form.walletType) errors.walletType = 'Selecione um tipo de carteira.';
    if (!form.referralCode.trim()) errors.referralCode = 'Informe o código de indicação.';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Informe um e-mail válido.';
    }
    if (!form.ensName.trim()) errors.ensName = 'Informe o nome ENS.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitError('Verifique os campos obrigatórios destacados no formulário.');
      return;
    }

    isSubmittingLockRef.current = true;
    try {
      const currentKey = idempotencyKeyRef.current;
      window.sessionStorage.setItem(
        PENDING_ORDER_STORAGE_KEY,
        JSON.stringify({
          idempotencyKey: currentKey,
          userId: user?.id,
          orderId: activeOrderId,
        })
      );

      const res = await createOrderMutation.mutateAsync({
        idempotencyKey: currentKey,
        items: items.map((i) => ({
          nftId: i.nftId,
          edition: i.edition,
          quantity: i.quantity,
          expectedUnitPriceEth: i.unitPriceEth,
        })),
        couponCode: cart?.couponCode,
        expectedTotalEth: cart?.totalEth || '0.00',
        collector: form,
      });

      setActiveOrderId(res.order.id);
      window.sessionStorage.setItem(
        PENDING_ORDER_STORAGE_KEY,
        JSON.stringify({
          idempotencyKey: currentKey,
          userId: user?.id,
          orderId: res.order.id,
        })
      );

      if (res.order.status === 'confirmed') {
        window.sessionStorage.removeItem(PENDING_ORDER_STORAGE_KEY);
        queryClient.invalidateQueries({ queryKey: ['cart'] });
        queryClient.invalidateQueries({ queryKey: ['quote'] });
        queryClient.invalidateQueries({ queryKey: ['nfts'] });
        navigate({
          to: '/orders/$orderId',
          params: { orderId: res.order.id },
        });
      }
    } catch (err) {
      const apiErr = extractApiError(err);
      if (apiErr.fieldErrors) {
        setFieldErrors(apiErr.fieldErrors);
      }
      if (
        apiErr.code === 'QUOTE_OUTDATED' ||
        apiErr.code === 'AVAILABILITY_CHANGED'
      ) {
        setQuoteConflictError(apiErr.message);
      } else {
        setSubmitError(apiErr.message);
      }
    } finally {
      isSubmittingLockRef.current = false;
    }
  };

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-8 pt-4 sm:pt-6">
      <div className="flex sm:hidden items-center justify-between mb-6 relative">
        <button
          type="button"
          aria-label="Voltar ao carrinho"
          onClick={() => navigate({ to: '/cart' })}
          className="w-10 h-10 rounded-full bg-[#21160F] border border-[#3C281B] text-[#CF8A49] flex items-center justify-center z-10"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="absolute inset-0 flex items-center justify-center text-base font-extrabold text-[#F5EFEA] pointer-events-none">
          Pagamento com carteira
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
        <span className="text-[#F5EFEA] font-semibold">Pagamento</span>
      </nav>

      {activeOrder && activeOrder.status === 'pending' && (
        <div
          role="status"
          aria-live="polite"
          data-testid="checkout-order-pending"
          className="mb-6 p-5 rounded-lg bg-[#261A12] border border-[#CF8A49] flex items-center justify-between gap-4 text-xs"
        >
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-[#CF8A49] animate-spin shrink-0" />
            <div>
              <p className="font-extrabold text-[#F5EFEA]">
                Pedido #{activeOrder.id} pendente de confirmação na rede {activeOrder.network}
              </p>
              <p className="text-[#D7C7B8] mt-0.5">
                Hash da transação: {activeOrder.transactionHash} — Aguardando confirmação via Socket.IO...
              </p>
            </div>
          </div>
        </div>
      )}

      {activeOrder && activeOrder.status === 'rejected' && (
        <div
          role="alert"
          data-testid="checkout-order-rejected"
          className="mb-6 p-5 rounded-lg bg-[#291210] border border-[#E05844] flex flex-wrap items-center justify-between gap-4 text-xs"
        >
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-[#E05844] shrink-0" />
            <div>
              <p className="font-extrabold text-[#F5EFEA]">
                Pagamento recusado para o pedido #{activeOrder.id}
              </p>
              <p className="text-[#D7C7B8] mt-0.5">
                {activeOrder.failureReason ||
                  'A transação foi recusada pela carteira. Seus itens foram preservados no carrinho.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="checkout-new-attempt-button"
            onClick={handleResetRejectedOrder}
            className="px-4 h-8 bg-[#CF8A49] hover:bg-[#DF9B5A] text-[#130D09] font-extrabold rounded"
          >
            Preparar nova tentativa
          </button>
        </div>
      )}

      {(cart?.hasOutdatedItems || quoteConflictError) && (
        <div
          role="alert"
          data-testid="checkout-quote-conflict"
          className="mb-6 p-4 rounded-lg bg-[#2B1B10] border border-[#CF8A49] flex flex-wrap items-center justify-between gap-4 text-xs"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[#CF8A49] shrink-0" />
            <div>
              <p className="font-bold text-[#F5EFEA]">
                Cotação desatualizada — Nova confirmação necessária
              </p>
              <p className="text-[#D7C7B8] mt-0.5">
                {quoteConflictError ||
                  'O preço ou disponibilidade de um item no seu carrinho mudou em tempo real. Revise o resumo atualizado e confirme para prosseguir.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="checkout-acknowledge-quote"
            onClick={handleAcknowledgeChanges}
            className="px-4 h-8 bg-[#CF8A49] hover:bg-[#DF9B5A] text-[#130D09] font-extrabold rounded"
          >
            Aceitar e atualizar cotação
          </button>
        </div>
      )}

      {submitError && (
        <div
          role="alert"
          data-testid="checkout-submit-error"
          className="mb-6 p-4 rounded-lg bg-[#291210] border border-[#E05844] flex flex-wrap items-center justify-between gap-4 text-xs"
        >
          <span>{submitError}</span>
        </div>
      )}

      {!isCartLoading && items.length === 0 && !activeOrder ? (
        <div className="bg-[#1F150F] border border-[#3C281B] rounded-xl p-10 text-center mb-14">
          <p className="text-sm font-bold text-[#F5EFEA] mb-3">
            Não há itens no carrinho para pagamento.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center px-5 h-9 bg-[#CF8A49] text-[#130D09] text-xs font-extrabold rounded"
          >
            Explorar catálogo
          </Link>
        </div>
      ) : (
        <form
          onSubmit={handleConfirmPurchase}
          noValidate
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 mb-14 items-start"
        >
          <div className="sm:hidden flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-[#F5EFEA]">Carteira conectada</span>
              <Link to="/wallets" className="font-bold text-[#CF8A49]">
                Trocar carteira
              </Link>
            </div>

            <label
              onClick={() => {
                setMobileWalletKind('reserva');
                handleFieldChange('network', 'Polygon');
              }}
              className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer ${
                mobileWalletKind === 'reserva'
                  ? 'bg-[#21160F] border-[#CF8A49]'
                  : 'bg-[#1C130D] border-[#2C1D13]'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <input
                  type="radio"
                  name="mobileConnectedWallet"
                  checked={mobileWalletKind === 'reserva'}
                  onChange={() => setMobileWalletKind('reserva')}
                  className="accent-[#CF8A49]"
                />
                <div className="text-xs">
                  <p className="font-extrabold text-[#F5EFEA]">Reserva</p>
                  <p className="text-[#A89688] text-[11px] mt-0.5">
                    {secondaryWallet?.secondaryAddressOrEns || 'nova.kurio.eth'}
                  </p>
                  <p className="text-[#A89688] text-[11px]">Rede Polygon</p>
                </div>
              </div>
              <MoreVertical className="w-4 h-4 text-[#A89688]" />
            </label>

            <label
              onClick={() => {
                setMobileWalletKind('principal');
                handleFieldChange('network', 'Ethereum');
              }}
              className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer ${
                mobileWalletKind === 'principal'
                  ? 'bg-[#21160F] border-[#CF8A49]'
                  : 'bg-[#1C130D] border-[#2C1D13]'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <input
                  type="radio"
                  name="mobileConnectedWallet"
                  checked={mobileWalletKind === 'principal'}
                  onChange={() => setMobileWalletKind('principal')}
                  className="accent-[#CF8A49]"
                />
                <div className="text-xs">
                  <p className="font-extrabold text-[#F5EFEA]">Principal</p>
                  <p className="text-[#A89688] text-[11px] mt-0.5">
                    {primaryWallet
                      ? `${primaryWallet.address.slice(0, 6)}...${primaryWallet.address.slice(-4)}`
                      : '0xA91F...E82C'}
                  </p>
                  <p className="text-[#A89688] text-[11px]">Rede principal Ethereum</p>
                </div>
              </div>
              <MoreVertical className="w-4 h-4 text-[#A89688]" />
            </label>
          </div>

          <div className="lg:col-span-7 flex flex-col gap-5 order-2 lg:order-1">
            <h2 className="text-sm font-extrabold text-[#F5EFEA]">
              Perfil do colecionador
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label htmlFor="chk-displayName" className="block text-[#D7C7B8] mb-1">
                  Nome de exibição<span className="text-[#E05844]">*</span>
                </label>
                <input
                  id="chk-displayName"
                  data-testid="chk-displayName"
                  type="text"
                  value={form.displayName}
                  onChange={(e) => handleFieldChange('displayName', e.target.value)}
                  aria-invalid={Boolean(fieldErrors.displayName)}
                  className="w-full h-9 px-3 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA]"
                />
                {fieldErrors.displayName && (
                  <p className="text-[11px] text-[#E05844] mt-1">
                    {fieldErrors.displayName}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="chk-username" className="block text-[#D7C7B8] mb-1">
                  Nome de usuário<span className="text-[#E05844]">*</span>
                </label>
                <input
                  id="chk-username"
                  data-testid="chk-username"
                  type="text"
                  value={form.username}
                  onChange={(e) => handleFieldChange('username', e.target.value)}
                  aria-invalid={Boolean(fieldErrors.username)}
                  className="w-full h-9 px-3 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA]"
                />
                {fieldErrors.username && (
                  <p className="text-[11px] text-[#E05844] mt-1">
                    {fieldErrors.username}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="chk-network" className="block text-[#D7C7B8] mb-1">
                  Rede <span className="text-[#E05844]">*</span>
                </label>
                <select
                  id="chk-network"
                  data-testid="chk-network"
                  value={form.network}
                  onChange={(e) =>
                    handleFieldChange('network', e.target.value as WalletNetwork)
                  }
                  className="w-full h-9 px-3 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA]"
                >
                  <option value="Ethereum">Ethereum</option>
                  <option value="Polygon">Polygon</option>
                  <option value="Solana">Solana</option>
                </select>
                {fieldErrors.network && (
                  <p className="text-[11px] text-[#E05844] mt-1">
                    {fieldErrors.network}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="chk-profileName" className="block text-[#D7C7B8] mb-1">
                  Nome do perfil<span className="text-[#E05844]">*</span>
                </label>
                <input
                  id="chk-profileName"
                  data-testid="chk-profileName"
                  type="text"
                  value={form.profileName}
                  onChange={(e) => handleFieldChange('profileName', e.target.value)}
                  aria-invalid={Boolean(fieldErrors.profileName)}
                  className="w-full h-9 px-3 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA]"
                />
                {fieldErrors.profileName && (
                  <p className="text-[11px] text-[#E05844] mt-1">
                    {fieldErrors.profileName}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="chk-walletAddress" className="block text-[#D7C7B8] mb-1">
                  Endereço da carteira<span className="text-[#E05844]">*</span>
                </label>
                <input
                  id="chk-walletAddress"
                  data-testid="chk-walletAddress"
                  type="text"
                  value={form.walletAddress}
                  onChange={(e) => handleFieldChange('walletAddress', e.target.value)}
                  placeholder="Endereço 0x da carteira"
                  aria-invalid={Boolean(fieldErrors.walletAddress)}
                  className="w-full h-9 px-3 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA] placeholder-[#7B695B]"
                />
                {fieldErrors.walletAddress && (
                  <p className="text-[11px] text-[#E05844] mt-1">
                    {fieldErrors.walletAddress}
                  </p>
                )}
              </div>

              <div className="flex flex-col justify-end">
                <label htmlFor="chk-secondaryWallet" className="sr-only">
                  ENS ou carteira secundária (opcional)
                </label>
                <input
                  id="chk-secondaryWallet"
                  data-testid="chk-secondaryWallet"
                  type="text"
                  value={form.secondaryWalletOrEns}
                  onChange={(e) =>
                    handleFieldChange('secondaryWalletOrEns', e.target.value)
                  }
                  placeholder="ENS ou carteira secundária (opcional)"
                  className="w-full h-9 px-3 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA] placeholder-[#7B695B]"
                />
              </div>

              <div>
                <label htmlFor="chk-walletType" className="block text-[#D7C7B8] mb-1">
                  Tipo de carteira<span className="text-[#E05844]">*</span>
                </label>
                <select
                  id="chk-walletType"
                  data-testid="chk-walletType"
                  value={form.walletType}
                  onChange={(e) =>
                    handleFieldChange('walletType', e.target.value as WalletType)
                  }
                  className="w-full h-9 px-3 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA]"
                >
                  <option value="Coinbase Wallet">Coinbase Wallet</option>
                  <option value="MetaMask">MetaMask</option>
                  <option value="WalletConnect">WalletConnect</option>
                </select>
              </div>

              <div>
                <label htmlFor="chk-referralCode" className="block text-[#D7C7B8] mb-1">
                  Código de indicação<span className="text-[#E05844]">*</span>
                </label>
                <input
                  id="chk-referralCode"
                  data-testid="chk-referralCode"
                  type="text"
                  value={form.referralCode}
                  onChange={(e) => handleFieldChange('referralCode', e.target.value)}
                  aria-invalid={Boolean(fieldErrors.referralCode)}
                  className="w-full h-9 px-3 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA]"
                />
                {fieldErrors.referralCode && (
                  <p className="text-[11px] text-[#E05844] mt-1">
                    {fieldErrors.referralCode}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="chk-email" className="block text-[#D7C7B8] mb-1">
                  E-mail<span className="text-[#E05844]">*</span>
                </label>
                <input
                  id="chk-email"
                  data-testid="chk-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  aria-invalid={Boolean(fieldErrors.email)}
                  className="w-full h-9 px-3 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA]"
                />
                {fieldErrors.email && (
                  <p className="text-[11px] text-[#E05844] mt-1">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="chk-ensName" className="block text-[#D7C7B8] mb-1">
                  Nome ENS <span className="text-[#E05844]">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    aria-label="Domínio ENS"
                    value={form.ensDomain}
                    onChange={(e) => handleFieldChange('ensDomain', e.target.value)}
                    className="w-20 h-9 px-2 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA]"
                  >
                    <option value=".eth">.eth</option>
                    <option value=".art">.art</option>
                    <option value=".sol">.sol</option>
                  </select>
                  <input
                    id="chk-ensName"
                    data-testid="chk-ensName"
                    type="text"
                    value={form.ensName}
                    onChange={(e) => handleFieldChange('ensName', e.target.value)}
                    aria-invalid={Boolean(fieldErrors.ensName)}
                    className="flex-1 min-w-0 h-9 px-3 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA]"
                  />
                </div>
                {fieldErrors.ensName && (
                  <p className="text-[11px] text-[#E05844] mt-1">
                    {fieldErrors.ensName}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs pt-1">
              <button
                type="button"
                role="switch"
                aria-checked={form.useAnotherWallet}
                data-testid="chk-use-another-wallet"
                onClick={() =>
                  handleFieldChange('useAnotherWallet', !form.useAnotherWallet)
                }
                className="inline-flex items-center gap-2 text-[#D7C7B8] hover:text-[#CF8A49]"
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    form.useAnotherWallet
                      ? 'border-[#CF8A49] bg-[#CF8A49]'
                      : 'border-[#CF8A49]'
                  }`}
                />
                <span>Usar outra carteira?</span>
              </button>
            </div>

            <div>
              <label
                htmlFor="chk-notes"
                className="block text-xs text-[#D7C7B8] mb-1.5"
              >
                Observação do colecionador (opcional)
              </label>
              <textarea
                id="chk-notes"
                data-testid="chk-notes"
                rows={4}
                value={form.notes}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                className="w-full p-3 bg-[#18100B] border border-[#3C281B] rounded text-xs text-[#F5EFEA] resize-y"
              />
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-4 order-1 lg:order-2">
            <h2 className="hidden sm:block text-sm font-extrabold text-[#F5EFEA]">
              Seus NFTs
            </h2>

            <div className="hidden sm:flex items-center justify-between text-xs font-bold text-[#F5EFEA] pb-2 border-b border-[#3C281B]">
              <span>NFTs</span>
              <span>Subtotal</span>
            </div>

            <div className="hidden sm:flex flex-col gap-2.5">
              {items.map((item) => {
                const lineTotal = mulEth(item.unitPriceEth, item.quantity);
                return (
                  <div
                    key={item.id}
                    data-testid={`checkout-item-${item.nftId}`}
                    className="bg-[#1F150F] border border-[#2C1D13] rounded-lg p-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#E5DEC9] shrink-0">
                        <img
                          src={item.nft.image}
                          alt={item.nft.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[#F5EFEA] truncate">
                          {item.nft.name}
                        </p>
                        <p className="text-[11px] text-[#7B695B]">
                          ID do token: {item.nft.tokenId}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[#A89688]">(x {item.quantity})</span>
                      <span className="font-extrabold text-[#CF8A49]">
                        {lineTotal} ETH
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden sm:block text-right text-[11px]">
              <span className="text-[#A89688]">Tem um código promocional? </span>
              <button
                type="button"
                data-testid="checkout-toggle-coupon"
                onClick={() => setShowCouponBox((v) => !v)}
                className="text-[#CF8A49] font-bold hover:underline"
              >
                Aplique aqui
              </button>
            </div>

            {showCouponBox && (
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Ex: KURIO10"
                    className="flex-1 h-8 px-2.5 bg-[#130D09] border border-[#3C281B] rounded text-xs text-[#F5EFEA]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-3 h-8 bg-[#CF8A49] text-[#130D09] text-xs font-bold rounded"
                  >
                    Aplicar
                  </button>
                </div>
                {couponError && (
                  <p className="text-[11px] text-[#E05844]">{couponError}</p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 text-xs pt-1">
              <div className="flex items-center justify-between text-[#D7C7B8]">
                <span>Subtotal</span>
                <span data-testid="checkout-subtotal" className="font-bold text-[#F5EFEA]">
                  {cart?.subtotalEth} ETH
                </span>
              </div>
              <div className="flex items-center justify-between text-[#D7C7B8]">
                <span>Desconto do lançamento</span>
                <span data-testid="checkout-discount">
                  (-) {cart?.discountEth === '0.00' ? '00.00' : `${cart?.discountEth} ETH`}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#D7C7B8]">
                <span>Taxa de rede</span>
                <span className="font-bold text-[#F5EFEA]">
                  {cart?.networkFeeEth} ETH
                </span>
              </div>
              <div className="text-center text-[10px] text-[#CF8A49] pb-1">
                Taxa estimada
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#3C281B] text-sm font-extrabold">
                <span className="text-[#F5EFEA]">Total</span>
                <span data-testid="checkout-total" className="text-[#CF8A49]">
                  {cart?.totalEth} ETH
                </span>
              </div>
            </div>

            <div className="pt-1 sm:pt-2 flex flex-col gap-3">
              <h3 className="text-xs font-extrabold text-[#F5EFEA] sm:text-center">
                Carteira e rede
              </h3>

              <div
                role="radiogroup"
                aria-label="Selecionar provedor de carteira"
                className="flex flex-col gap-2.5 text-xs"
              >
                <label
                  className={`flex items-center justify-between sm:justify-start gap-3 p-3.5 sm:p-3 rounded-2xl sm:rounded border cursor-pointer transition-colors ${
                    form.selectedWalletOption === 'saved'
                      ? 'border-[#CF8A49] bg-[#21160F] sm:bg-[#1F150F]'
                      : 'border-[#2C1D13] sm:border-[#3C281B] bg-[#1C130D] sm:bg-[#18100B]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="sm:hidden w-9 h-9 rounded-full bg-[#261A12] border border-[#3C281B] text-[#CF8A49] font-extrabold flex items-center justify-center">
                      W
                    </span>
                    <span className="sm:hidden text-[#F5EFEA] font-medium">
                      WalletConnect
                    </span>
                    <input
                      type="radio"
                      name="walletOption"
                      checked={form.selectedWalletOption === 'saved'}
                      onChange={() => {
                        handleFieldChange('selectedWalletOption', 'saved');
                        handleFieldChange('walletType', 'WalletConnect');
                      }}
                      className="hidden sm:inline-block accent-[#CF8A49]"
                    />
                    <span className="hidden sm:inline-block px-2.5 py-1 rounded bg-[#261A12] border border-[#3C281B] text-[9px] font-bold tracking-wider text-[#CF8A49]">
                      METAMASK • WALLETCONNECT • COINBASE
                    </span>
                  </div>
                  <input
                    type="radio"
                    name="walletOptionMobile"
                    checked={form.selectedWalletOption === 'saved'}
                    onChange={() => {
                      handleFieldChange('selectedWalletOption', 'saved');
                      handleFieldChange('walletType', 'WalletConnect');
                    }}
                    className="sm:hidden accent-[#CF8A49]"
                  />
                </label>

                <label
                  className={`flex items-center justify-between sm:justify-start gap-3 p-3.5 sm:p-3 rounded-2xl sm:rounded border cursor-pointer transition-colors ${
                    form.selectedWalletOption === 'metamask'
                      ? 'border-[#CF8A49] bg-[#21160F] sm:bg-[#1F150F]'
                      : 'border-[#2C1D13] sm:border-[#3C281B] bg-[#1C130D] sm:bg-[#18100B]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="sm:hidden w-9 h-9 rounded-full bg-[#261A12] border border-[#3C281B] text-[#CF8A49] font-extrabold flex items-center justify-center">
                      M
                    </span>
                    <input
                      type="radio"
                      name="walletOption"
                      checked={form.selectedWalletOption === 'metamask'}
                      onChange={() => {
                        handleFieldChange('selectedWalletOption', 'metamask');
                        handleFieldChange('walletType', 'MetaMask');
                      }}
                      className="hidden sm:inline-block accent-[#CF8A49]"
                    />
                    <span className="text-[#F5EFEA] font-medium">MetaMask</span>
                  </div>
                  <input
                    type="radio"
                    name="walletOptionMobile"
                    checked={form.selectedWalletOption === 'metamask'}
                    onChange={() => {
                      handleFieldChange('selectedWalletOption', 'metamask');
                      handleFieldChange('walletType', 'MetaMask');
                    }}
                    className="sm:hidden accent-[#CF8A49]"
                  />
                </label>

                <label
                  className={`flex items-center justify-between sm:justify-start gap-3 p-3.5 sm:p-3 rounded-2xl sm:rounded border cursor-pointer transition-colors ${
                    form.selectedWalletOption === 'coinbase'
                      ? 'border-[#CF8A49] bg-[#21160F] sm:bg-[#1F150F]'
                      : 'border-[#2C1D13] sm:border-[#3C281B] bg-[#1C130D] sm:bg-[#18100B]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="sm:hidden w-9 h-9 rounded-full bg-[#261A12] border border-[#3C281B] text-[#CF8A49] flex items-center justify-center">
                      <WalletIcon className="w-4 h-4" />
                    </span>
                    <input
                      type="radio"
                      name="walletOption"
                      checked={form.selectedWalletOption === 'coinbase'}
                      onChange={() => {
                        handleFieldChange('selectedWalletOption', 'coinbase');
                        handleFieldChange('walletType', 'Coinbase Wallet');
                      }}
                      className="hidden sm:inline-block accent-[#CF8A49]"
                    />
                    <span className="text-[#F5EFEA] font-medium">Coinbase Wallet</span>
                  </div>
                  <input
                    type="radio"
                    name="walletOptionMobile"
                    checked={form.selectedWalletOption === 'coinbase'}
                    onChange={() => {
                      handleFieldChange('selectedWalletOption', 'coinbase');
                      handleFieldChange('walletType', 'Coinbase Wallet');
                    }}
                    className="sm:hidden accent-[#CF8A49]"
                  />
                </label>
              </div>

              <div className="sm:hidden flex items-center justify-end gap-4 pt-2 text-sm font-extrabold">
                <span className="text-[#F5EFEA]">Total:</span>
                <span className="text-[#CF8A49]">{cart?.totalEth} ETH</span>
              </div>

              <div className="p-2.5 rounded bg-[#18100B] border border-[#3C281B] flex flex-col gap-2 text-[11px]">
                <p className="text-[10px] text-[#A89688] flex items-start gap-1.5 leading-snug">
                  <Info className="w-3.5 h-3.5 text-[#CF8A49] shrink-0 mt-0.5" />
                  <span>
                    Informativo: esta seção é um mock interativo para simular os estados de conexão da carteira (Conectada, Recusada ou Desconectada).
                  </span>
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[#2C1D13]">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${
                        walletStatus === 'connected'
                          ? 'text-[#4CAF7A]'
                          : 'text-[#E05844]'
                      }`}
                    />
                    <span className="text-[#D7C7B8]">
                      Status:{' '}
                      <strong className="text-[#F5EFEA]">
                        {walletStatus === 'connected'
                          ? 'Conectada'
                          : walletStatus === 'rejected'
                          ? 'Recusada'
                          : 'Desconectada'}
                      </strong>
                    </span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      data-testid="wallet-sim-connect"
                      onClick={() => {
                        setWalletStatus('connected');
                        setSubmitError(null);
                        toast({
                          title: 'Carteira conectada',
                          description: `${form.walletType} conectada na rede ${form.network}.`,
                          variant: 'success',
                        });
                      }}
                      className={`px-2 py-0.5 rounded border ${
                        walletStatus === 'connected'
                          ? 'border-[#4CAF7A] text-[#4CAF7A]'
                          : 'border-[#3C281B] text-[#A89688]'
                      }`}
                    >
                      Conectar
                    </button>
                    <button
                      type="button"
                      data-testid="wallet-sim-reject"
                      onClick={() => setWalletStatus('rejected')}
                      className={`px-2 py-0.5 rounded border ${
                        walletStatus === 'rejected'
                          ? 'border-[#E05844] text-[#E05844]'
                          : 'border-[#3C281B] text-[#A89688]'
                      }`}
                    >
                      Recusar
                    </button>
                    <button
                      type="button"
                      data-testid="wallet-sim-disconnect"
                      onClick={() => setWalletStatus('disconnected')}
                      className={`px-2 py-0.5 rounded border ${
                        walletStatus === 'disconnected'
                          ? 'border-[#E05844] text-[#E05844]'
                          : 'border-[#3C281B] text-[#A89688]'
                      }`}
                    >
                      Desconectar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              data-testid="checkout-confirm-button"
              disabled={
                createOrderMutation.isPending ||
                activeOrder?.status === 'pending' ||
                Boolean(cart?.hasOutdatedItems)
              }
              className="mt-2 w-full h-12 sm:h-11 bg-[#CF8A49] hover:bg-[#DF9B5A] disabled:opacity-50 text-[#130D09] text-xs font-extrabold rounded-full sm:rounded transition-colors flex items-center justify-center gap-2"
            >
              {(createOrderMutation.isPending || activeOrder?.status === 'pending') && (
                <RefreshCw className="w-4 h-4 animate-spin" />
              )}
              <span>
                {activeOrder?.status === 'pending'
                  ? 'Confirmando na rede...'
                  : createOrderMutation.isPending
                  ? 'Enviando pedido...'
                  : 'Confirmar compra'}
              </span>
            </button>
          </div>
        </form>
      )}
    </main>
  );
};
