import React, { useEffect, useState } from 'react';
import { ProfileSidebar } from '@/components/layout/ProfileSidebar';
import {
  UpsertWalletPayload,
  WalletNetwork,
  WalletType,
} from '@/types/contracts';
import { useUpsertWalletMutation, useWalletsQuery } from '@/hooks/useQueries';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { extractApiError } from '@/services/api';

const EMPTY_WALLET_FORM: UpsertWalletPayload = {
  kind: 'primary',
  displayName: '',
  nickname: '',
  network: 'Ethereum',
  profileName: '',
  address: '',
  secondaryAddressOrEns: '',
  walletType: 'Coinbase Wallet',
  referralCode: '',
  email: '',
  ensDomain: '.eth',
  ensName: '',
  sameAsPrimary: false,
};

export const WalletsPage: React.FC = () => {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { toast } = useToast();
  const { data: walletsData, isLoading } = useWalletsQuery();
  const upsertWalletMutation = useUpsertWalletMutation();

  const primaryWallet = (walletsData?.wallets ?? []).find((w) => w.kind === 'primary');
  const secondaryWallet = (walletsData?.wallets ?? []).find((w) => w.kind === 'secondary');

  const [primaryForm, setPrimaryForm] = useState<UpsertWalletPayload>({
    ...EMPTY_WALLET_FORM,
    kind: 'primary',
  });
  const [primaryErrors, setPrimaryErrors] = useState<Record<string, string>>({});

  const [showSecondaryForm, setShowSecondaryForm] = useState(false);
  const [sameAsPrimary, setSameAsPrimary] = useState(false);
  const [secondaryForm, setSecondaryForm] = useState<UpsertWalletPayload>({
    ...EMPTY_WALLET_FORM,
    kind: 'secondary',
  });
  const [secondaryErrors, setSecondaryErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (primaryWallet) {
      setPrimaryForm({
        kind: 'primary',
        displayName: primaryWallet.displayName,
        nickname: primaryWallet.nickname,
        network: primaryWallet.network,
        profileName: primaryWallet.profileName,
        address: primaryWallet.address,
        secondaryAddressOrEns: primaryWallet.secondaryAddressOrEns || '',
        walletType: primaryWallet.walletType,
        referralCode: primaryWallet.referralCode,
        email: primaryWallet.email,
        ensDomain: primaryWallet.ensDomain || '.eth',
        ensName: primaryWallet.ensName,
      });
    } else if (user) {
      setPrimaryForm((prev) => ({
        ...prev,
        displayName: user.name,
        profileName: user.profileName || `${user.username}.Kurio`,
        referralCode: user.referralCode || 'KURIO-2026',
        email: user.email,
        ensName: user.ensName || user.username,
      }));
    }
  }, [primaryWallet, user]);

  useEffect(() => {
    if (secondaryWallet) {
      setShowSecondaryForm(true);
      setSameAsPrimary(Boolean(secondaryWallet.sameAsPrimary));
      setSecondaryForm({
        kind: 'secondary',
        displayName: secondaryWallet.displayName,
        nickname: secondaryWallet.nickname,
        network: secondaryWallet.network,
        profileName: secondaryWallet.profileName,
        address: secondaryWallet.address,
        secondaryAddressOrEns: secondaryWallet.secondaryAddressOrEns || '',
        walletType: secondaryWallet.walletType,
        referralCode: secondaryWallet.referralCode,
        email: secondaryWallet.email,
        ensDomain: secondaryWallet.ensDomain || '.eth',
        ensName: secondaryWallet.ensName,
        sameAsPrimary: secondaryWallet.sameAsPrimary,
      });
    }
  }, [secondaryWallet]);

  if (!isAuthenticated) {
    return (
      <main className="max-w-[1280px] mx-auto px-4 sm:px-8 py-14 text-center">
        <div className="max-w-md mx-auto bg-[#1F150F] border border-[#3C281B] rounded-xl p-8 flex flex-col items-center gap-4">
          <h1 className="text-base font-extrabold text-[#F5EFEA]">
            Faça login para gerenciar suas carteiras
          </h1>
          <button
            type="button"
            data-testid="wallets-login-button"
            onClick={() => openAuthModal('login', '/wallets')}
            className="px-6 h-10 bg-[#CF8A49] text-[#130D09] text-xs font-extrabold rounded"
          >
            Entrar
          </button>
        </div>
      </main>
    );
  }

  const handleSavePrimary = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrimaryErrors({});
    try {
      await upsertWalletMutation.mutateAsync(primaryForm);
      toast({
        title: 'Carteira principal salva',
        description: 'Os dados da sua carteira principal foram atualizados.',
        variant: 'success',
      });
    } catch (err) {
      const apiErr = extractApiError(err);
      if (apiErr.fieldErrors) setPrimaryErrors(apiErr.fieldErrors);
      toast({
        title: 'Erro ao salvar carteira',
        description: apiErr.message,
        variant: 'error',
      });
    }
  };

  const handleSaveSecondary = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecondaryErrors({});
    try {
      await upsertWalletMutation.mutateAsync({
        ...secondaryForm,
        kind: 'secondary',
        sameAsPrimary,
      });
      toast({
        title: 'Carteira secundária salva',
        description: 'Sua carteira secundária foi registrada com sucesso.',
        variant: 'success',
      });
    } catch (err) {
      const apiErr = extractApiError(err);
      if (apiErr.fieldErrors) setSecondaryErrors(apiErr.fieldErrors);
      toast({
        title: 'Erro ao salvar carteira secundária',
        description: apiErr.message,
        variant: 'error',
      });
    }
  };

  const handleToggleSameAsPrimary = () => {
    const next = !sameAsPrimary;
    setSameAsPrimary(next);
    if (next) {
      setShowSecondaryForm(true);
      setSecondaryForm({
        ...primaryForm,
        kind: 'secondary',
        nickname: `${primaryForm.nickname || 'Carteira'} (Secundária)`,
        sameAsPrimary: true,
      });
    }
  };

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-8 pt-8 pb-16">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <ProfileSidebar />

        <div className="flex-1 w-full flex flex-col gap-10">

          <section aria-label="Carteira principal">
            <div className="flex items-center justify-between mb-1">
              <h1 className="text-sm sm:text-base font-extrabold text-[#F5EFEA]">
                Carteira principal
              </h1>
              <button
                type="button"
                onClick={() =>
                  setPrimaryForm({
                    ...EMPTY_WALLET_FORM,
                    kind: 'primary',
                    email: user?.email || '',
                  })
                }
                className="text-xs font-bold text-[#CF8A49] hover:underline"
              >
                Adicionar
              </button>
            </div>
            <p className="text-xs text-[#A89688] mb-6">
              Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
            </p>

            {isLoading ? (
              <p className="text-xs text-[#A89688]">Carregando carteiras...</p>
            ) : (
              <form
                onSubmit={handleSavePrimary}
                noValidate
                className="flex flex-col gap-5 text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">

                  <div>
                    <label
                      htmlFor="wp-displayName"
                      className="block text-[#F5EFEA] mb-1.5"
                    >
                      Nome de exibição<span className="text-[#E05844]">*</span>
                    </label>
                    <input
                      id="wp-displayName"
                      data-testid="wp-displayName"
                      type="text"
                      value={primaryForm.displayName}
                      onChange={(e) =>
                        setPrimaryForm((p) => ({ ...p, displayName: e.target.value }))
                      }
                      aria-invalid={Boolean(primaryErrors.displayName)}
                      className="w-full h-9 px-3 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA]"
                    />
                    {primaryErrors.displayName && (
                      <p className="text-[11px] text-[#E05844] mt-1">
                        {primaryErrors.displayName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="wp-nickname"
                      className="block text-[#F5EFEA] mb-1.5"
                    >
                      Apelido da carteira<span className="text-[#E05844]">*</span>
                    </label>
                    <input
                      id="wp-nickname"
                      data-testid="wp-nickname"
                      type="text"
                      value={primaryForm.nickname}
                      onChange={(e) =>
                        setPrimaryForm((p) => ({ ...p, nickname: e.target.value }))
                      }
                      aria-invalid={Boolean(primaryErrors.nickname)}
                      className="w-full h-9 px-3 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA]"
                    />
                    {primaryErrors.nickname && (
                      <p className="text-[11px] text-[#E05844] mt-1">
                        {primaryErrors.nickname}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="wp-network" className="block text-[#F5EFEA] mb-1.5">
                      Rede <span className="text-[#E05844]">*</span>
                    </label>
                    <select
                      id="wp-network"
                      data-testid="wp-network"
                      value={primaryForm.network}
                      onChange={(e) =>
                        setPrimaryForm((p) => ({
                          ...p,
                          network: e.target.value as WalletNetwork,
                        }))
                      }
                      className="w-full h-9 px-3 bg-[#18100B] border border-[#3C281B] rounded text-[#A89688] focus:text-[#F5EFEA]"
                    >
                      <option value="">Selecione uma rede</option>
                      <option value="Ethereum">Ethereum</option>
                      <option value="Polygon">Polygon</option>
                      <option value="Solana">Solana</option>
                    </select>
                    {primaryErrors.network && (
                      <p className="text-[11px] text-[#E05844] mt-1">
                        {primaryErrors.network}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="wp-profileName"
                      className="block text-[#F5EFEA] mb-1.5"
                    >
                      Nome do perfil<span className="text-[#E05844]">*</span>
                    </label>
                    <input
                      id="wp-profileName"
                      data-testid="wp-profileName"
                      type="text"
                      value={primaryForm.profileName}
                      onChange={(e) =>
                        setPrimaryForm((p) => ({ ...p, profileName: e.target.value }))
                      }
                      aria-invalid={Boolean(primaryErrors.profileName)}
                      className="w-full h-9 px-3 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA]"
                    />
                    {primaryErrors.profileName && (
                      <p className="text-[11px] text-[#E05844] mt-1">
                        {primaryErrors.profileName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="wp-address" className="block text-[#F5EFEA] mb-1.5">
                      Endereço da carteira<span className="text-[#E05844]">*</span>
                    </label>
                    <input
                      id="wp-address"
                      data-testid="wp-address"
                      type="text"
                      value={primaryForm.address}
                      onChange={(e) =>
                        setPrimaryForm((p) => ({ ...p, address: e.target.value }))
                      }
                      placeholder="Endereço 0x da carteira"
                      aria-invalid={Boolean(primaryErrors.address)}
                      className="w-full h-9 px-3 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA] placeholder-[#7B695B]"
                    />
                    {primaryErrors.address && (
                      <p className="text-[11px] text-[#E05844] mt-1">
                        {primaryErrors.address}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col justify-end">
                    <label htmlFor="wp-secondaryAddress" className="sr-only">
                      ENS ou carteira secundária (opcional)
                    </label>
                    <input
                      id="wp-secondaryAddress"
                      data-testid="wp-secondaryAddress"
                      type="text"
                      value={primaryForm.secondaryAddressOrEns}
                      onChange={(e) =>
                        setPrimaryForm((p) => ({
                          ...p,
                          secondaryAddressOrEns: e.target.value,
                        }))
                      }
                      placeholder="ENS ou carteira secundária (opcional)"
                      className="w-full h-9 px-3 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA] placeholder-[#7B695B]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="wp-walletType"
                      className="block text-[#F5EFEA] mb-1.5"
                    >
                      Tipo de carteira<span className="text-[#E05844]">*</span>
                    </label>
                    <select
                      id="wp-walletType"
                      data-testid="wp-walletType"
                      value={primaryForm.walletType}
                      onChange={(e) =>
                        setPrimaryForm((p) => ({
                          ...p,
                          walletType: e.target.value as WalletType,
                        }))
                      }
                      className="w-full h-9 px-3 bg-[#18100B] border border-[#3C281B] rounded text-[#A89688] focus:text-[#F5EFEA]"
                    >
                      <option value="">Selecione uma carteira</option>
                      <option value="MetaMask">MetaMask</option>
                      <option value="Coinbase Wallet">Coinbase Wallet</option>
                      <option value="WalletConnect">WalletConnect</option>
                    </select>
                    {primaryErrors.walletType && (
                      <p className="text-[11px] text-[#E05844] mt-1">
                        {primaryErrors.walletType}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="wp-referralCode"
                      className="block text-[#F5EFEA] mb-1.5"
                    >
                      Código de indicação<span className="text-[#E05844]">*</span>
                    </label>
                    <input
                      id="wp-referralCode"
                      data-testid="wp-referralCode"
                      type="text"
                      value={primaryForm.referralCode}
                      onChange={(e) =>
                        setPrimaryForm((p) => ({ ...p, referralCode: e.target.value }))
                      }
                      aria-invalid={Boolean(primaryErrors.referralCode)}
                      className="w-full h-9 px-3 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA]"
                    />
                    {primaryErrors.referralCode && (
                      <p className="text-[11px] text-[#E05844] mt-1">
                        {primaryErrors.referralCode}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="wp-email" className="block text-[#F5EFEA] mb-1.5">
                      E-mail<span className="text-[#E05844]">*</span>
                    </label>
                    <input
                      id="wp-email"
                      data-testid="wp-email"
                      type="email"
                      value={primaryForm.email}
                      onChange={(e) =>
                        setPrimaryForm((p) => ({ ...p, email: e.target.value }))
                      }
                      aria-invalid={Boolean(primaryErrors.email)}
                      className="w-full h-9 px-3 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA]"
                    />
                    {primaryErrors.email && (
                      <p className="text-[11px] text-[#E05844] mt-1">
                        {primaryErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="wp-ensName" className="block text-[#F5EFEA] mb-1.5">
                      Nome ENS <span className="text-[#E05844]">*</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        aria-label="Domínio ENS principal"
                        value={primaryForm.ensDomain}
                        onChange={(e) =>
                          setPrimaryForm((p) => ({ ...p, ensDomain: e.target.value }))
                        }
                        className="w-20 h-9 px-2 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA]"
                      >
                        <option value=".eth">.eth</option>
                        <option value=".art">.art</option>
                        <option value=".sol">.sol</option>
                      </select>
                      <input
                        id="wp-ensName"
                        data-testid="wp-ensName"
                        type="text"
                        value={primaryForm.ensName}
                        onChange={(e) =>
                          setPrimaryForm((p) => ({ ...p, ensName: e.target.value }))
                        }
                        aria-invalid={Boolean(primaryErrors.ensName)}
                        className="flex-1 min-w-0 h-9 px-3 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA]"
                      />
                    </div>
                    {primaryErrors.ensName && (
                      <p className="text-[11px] text-[#E05844] mt-1">
                        {primaryErrors.ensName}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    data-testid="wp-save-primary"
                    disabled={upsertWalletMutation.isPending}
                    className="px-5 h-9 bg-[#CF8A49] hover:bg-[#DF9B5A] text-[#130D09] text-xs font-extrabold rounded transition-colors"
                  >
                    Salvar carteira
                  </button>
                </div>
              </form>
            )}
          </section>

          <section aria-label="Carteira secundária" className="pt-2">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-1.5">
              <h2 className="text-sm sm:text-base font-extrabold text-[#F5EFEA]">
                Carteira secundária
              </h2>

              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  role="switch"
                  aria-checked={sameAsPrimary}
                  data-testid="ws-same-as-primary"
                  onClick={handleToggleSameAsPrimary}
                  className="inline-flex items-center gap-2 text-[#D7C7B8] hover:text-[#CF8A49]"
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      sameAsPrimary
                        ? 'border-[#CF8A49] bg-[#CF8A49]'
                        : 'border-[#CF8A49]'
                    }`}
                  />
                  <span>Igual à carteira principal</span>
                </button>

                <button
                  type="button"
                  data-testid="ws-add-button"
                  onClick={() => setShowSecondaryForm((v) => !v)}
                  className="font-bold text-[#CF8A49] hover:underline"
                >
                  Adicionar
                </button>
              </div>
            </div>

            {!showSecondaryForm && !secondaryWallet ? (
              <p className="text-xs text-[#A89688]">
                Você ainda não adicionou uma carteira secundária.
              </p>
            ) : (
              <form
                onSubmit={handleSaveSecondary}
                noValidate
                data-testid="secondary-wallet-form"
                className="mt-4 p-5 bg-[#1F150F] border border-[#3C281B] rounded-lg flex flex-col gap-4 text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="ws-displayName"
                      className="block text-[#F5EFEA] mb-1"
                    >
                      Nome de exibição<span className="text-[#E05844]">*</span>
                    </label>
                    <input
                      id="ws-displayName"
                      data-testid="ws-displayName"
                      type="text"
                      value={secondaryForm.displayName}
                      onChange={(e) =>
                        setSecondaryForm((p) => ({
                          ...p,
                          displayName: e.target.value,
                        }))
                      }
                      className="w-full h-9 px-3 bg-[#130D09] border border-[#3C281B] rounded text-[#F5EFEA]"
                    />
                    {secondaryErrors.displayName && (
                      <p className="text-[11px] text-[#E05844] mt-1">
                        {secondaryErrors.displayName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="ws-nickname" className="block text-[#F5EFEA] mb-1">
                      Apelido da carteira<span className="text-[#E05844]">*</span>
                    </label>
                    <input
                      id="ws-nickname"
                      data-testid="ws-nickname"
                      type="text"
                      value={secondaryForm.nickname}
                      onChange={(e) =>
                        setSecondaryForm((p) => ({ ...p, nickname: e.target.value }))
                      }
                      className="w-full h-9 px-3 bg-[#130D09] border border-[#3C281B] rounded text-[#F5EFEA]"
                    />
                    {secondaryErrors.nickname && (
                      <p className="text-[11px] text-[#E05844] mt-1">
                        {secondaryErrors.nickname}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="ws-network" className="block text-[#F5EFEA] mb-1">
                      Rede<span className="text-[#E05844]">*</span>
                    </label>
                    <select
                      id="ws-network"
                      data-testid="ws-network"
                      value={secondaryForm.network}
                      onChange={(e) =>
                        setSecondaryForm((p) => ({
                          ...p,
                          network: e.target.value as WalletNetwork,
                        }))
                      }
                      className="w-full h-9 px-3 bg-[#130D09] border border-[#3C281B] rounded text-[#F5EFEA]"
                    >
                      <option value="Ethereum">Ethereum</option>
                      <option value="Polygon">Polygon</option>
                      <option value="Solana">Solana</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="ws-profileName"
                      className="block text-[#F5EFEA] mb-1"
                    >
                      Nome do perfil<span className="text-[#E05844]">*</span>
                    </label>
                    <input
                      id="ws-profileName"
                      data-testid="ws-profileName"
                      type="text"
                      value={secondaryForm.profileName}
                      onChange={(e) =>
                        setSecondaryForm((p) => ({
                          ...p,
                          profileName: e.target.value,
                        }))
                      }
                      className="w-full h-9 px-3 bg-[#130D09] border border-[#3C281B] rounded text-[#F5EFEA]"
                    />
                  </div>

                  <div>
                    <label htmlFor="ws-address" className="block text-[#F5EFEA] mb-1">
                      Endereço da carteira secundária<span className="text-[#E05844]">*</span>
                    </label>
                    <input
                      id="ws-address"
                      data-testid="ws-address"
                      type="text"
                      value={secondaryForm.address}
                      onChange={(e) =>
                        setSecondaryForm((p) => ({ ...p, address: e.target.value }))
                      }
                      placeholder="Endereço 0x..."
                      className="w-full h-9 px-3 bg-[#130D09] border border-[#3C281B] rounded text-[#F5EFEA]"
                    />
                    {secondaryErrors.address && (
                      <p className="text-[11px] text-[#E05844] mt-1">
                        {secondaryErrors.address}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="ws-walletType" className="block text-[#F5EFEA] mb-1">
                      Tipo de carteira<span className="text-[#E05844]">*</span>
                    </label>
                    <select
                      id="ws-walletType"
                      data-testid="ws-walletType"
                      value={secondaryForm.walletType}
                      onChange={(e) =>
                        setSecondaryForm((p) => ({
                          ...p,
                          walletType: e.target.value as WalletType,
                        }))
                      }
                      className="w-full h-9 px-3 bg-[#130D09] border border-[#3C281B] rounded text-[#F5EFEA]"
                    >
                      <option value="MetaMask">MetaMask</option>
                      <option value="Coinbase Wallet">Coinbase Wallet</option>
                      <option value="WalletConnect">WalletConnect</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="ws-referral" className="block text-[#F5EFEA] mb-1">
                      Código de indicação<span className="text-[#E05844]">*</span>
                    </label>
                    <input
                      id="ws-referral"
                      data-testid="ws-referralCode"
                      type="text"
                      value={secondaryForm.referralCode}
                      onChange={(e) =>
                        setSecondaryForm((p) => ({
                          ...p,
                          referralCode: e.target.value,
                        }))
                      }
                      className="w-full h-9 px-3 bg-[#130D09] border border-[#3C281B] rounded text-[#F5EFEA]"
                    />
                  </div>

                  <div>
                    <label htmlFor="ws-email" className="block text-[#F5EFEA] mb-1">
                      E-mail<span className="text-[#E05844]">*</span>
                    </label>
                    <input
                      id="ws-email"
                      data-testid="ws-email"
                      type="email"
                      value={secondaryForm.email}
                      onChange={(e) =>
                        setSecondaryForm((p) => ({ ...p, email: e.target.value }))
                      }
                      className="w-full h-9 px-3 bg-[#130D09] border border-[#3C281B] rounded text-[#F5EFEA]"
                    />
                  </div>

                  <div>
                    <label htmlFor="ws-ensName" className="block text-[#F5EFEA] mb-1">
                      Nome ENS<span className="text-[#E05844]">*</span>
                    </label>
                    <input
                      id="ws-ensName"
                      data-testid="ws-ensName"
                      type="text"
                      value={secondaryForm.ensName}
                      onChange={(e) =>
                        setSecondaryForm((p) => ({ ...p, ensName: e.target.value }))
                      }
                      className="w-full h-9 px-3 bg-[#130D09] border border-[#3C281B] rounded text-[#F5EFEA]"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    data-testid="ws-save-secondary"
                    disabled={upsertWalletMutation.isPending}
                    className="px-5 h-9 bg-[#CF8A49] hover:bg-[#DF9B5A] text-[#130D09] text-xs font-extrabold rounded"
                  >
                    Salvar carteira secundária
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

