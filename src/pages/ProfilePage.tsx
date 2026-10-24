import React, { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Eye, EyeOff, Heart, Image as ImageIcon } from 'lucide-react';
import { ProfileSidebar } from '@/components/layout/ProfileSidebar';
import {
  useChangePasswordMutation,
  useFavoritesQuery,
  useOrdersQuery,
  useProfileQuery,
  useToggleFavoriteMutation,
  useUpdateProfileMutation,
} from '@/hooks/useQueries';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { extractApiError } from '@/services/api';

const AVATAR_PRESETS = [
  { label: 'Emerald Ape', url: '/assets/nfts/emerald-ape.png' },
  { label: 'Sage Nomad', url: '/assets/nfts/purple-ape.png' },
  { label: 'Ivory Baron', url: '/assets/nfts/ivory-ape.png' },
  { label: 'Golden Beat', url: '/assets/nfts/golden-ape.png' },
];

export const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: profileData } = useProfileQuery();
  const { data: favoritesData } = useFavoritesQuery();
  const { data: ordersData } = useOrdersQuery();
  const updateProfileMutation = useUpdateProfileMutation();
  const changePasswordMutation = useChangePasswordMutation();
  const toggleFavoriteMutation = useToggleFavoriteMutation();

  const currentUser = profileData?.user ?? user;

  const [name, setName] = useState(currentUser?.name || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [ensDomain, setEnsDomain] = useState(currentUser?.ensDomain || '.eth');
  const [ensName, setEnsName] = useState(
    currentUser?.ensName || currentUser?.username || ''
  );
  const [walletNickname, setWalletNickname] = useState(
    currentUser?.profileName || 'Vault Principal ETH'
  );
  const [avatar, setAvatar] = useState<string>(currentUser?.avatar || '');
  const [showPresetPicker, setShowPresetPicker] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  const currentUserId = currentUser?.id;
  const currentUserName = currentUser?.name;
  const currentUserUsername = currentUser?.username;
  const currentUserEmail = currentUser?.email;
  const currentUserEnsDomain = currentUser?.ensDomain;
  const currentUserEnsName = currentUser?.ensName;
  const currentUserProfileName = currentUser?.profileName;
  const currentUserAvatar = currentUser?.avatar;

  useEffect(() => {
    if (!currentUserId) return;
    setName(currentUserName || '');
    setUsername(currentUserUsername || '');
    setEmail(currentUserEmail || '');
    setEnsDomain(currentUserEnsDomain || '.eth');
    setEnsName(currentUserEnsName || currentUserUsername || '');
    setWalletNickname(currentUserProfileName || 'Vault Principal ETH');
    setAvatar(currentUserAvatar || '');
  }, [
    currentUserId,
    currentUserName,
    currentUserUsername,
    currentUserEmail,
    currentUserEnsDomain,
    currentUserEnsName,
    currentUserProfileName,
    currentUserAvatar,
  ]);

  if (!isAuthenticated) {
    return (
      <main className="max-w-[1280px] mx-auto px-4 sm:px-8 py-14 text-center">
        <div className="max-w-md mx-auto bg-[#1F150F] border border-[#3C281B] rounded-xl p-8 flex flex-col items-center gap-4">
          <h1 className="text-base font-extrabold text-[#F5EFEA]">
            Faça login para editar seu perfil de colecionador
          </h1>
          <button
            type="button"
            data-testid="profile-login-button"
            onClick={() => openAuthModal('login', '/profile')}
            className="px-6 h-10 bg-[#CF8A49] text-[#130D09] text-xs font-extrabold rounded"
          >
            Entrar
          </button>
        </div>
      </main>
    );
  }

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrors({});
    setPasswordErrors({});

    try {
      await updateProfileMutation.mutateAsync({
        name,
        username,
        email,
        avatar,
        profileName: walletNickname,
      });

      if (currentPassword || newPassword || confirmPassword) {
        await changePasswordMutation.mutateAsync({
          currentPassword,
          newPassword,
          confirmPassword,
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }

      toast({
        title: 'Perfil salvo',
        description: 'Seus dados de colecionador foram atualizados com sucesso.',
        variant: 'success',
      });
    } catch (err) {
      const apiErr = extractApiError(err);
      if (apiErr.fieldErrors) {
        setProfileErrors(apiErr.fieldErrors);
        setPasswordErrors(apiErr.fieldErrors);
      }
      toast({
        title: 'Erro ao salvar alterações',
        description: apiErr.message,
        variant: 'error',
      });
    }
  };

  const handleFileAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const favoriteItems = favoritesData?.items ?? [];
  const orders = ordersData?.orders ?? [];

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-8 pt-8 pb-16">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <ProfileSidebar />

        <div className="flex-1 w-full flex flex-col gap-10">

          <section aria-label="Perfil do colecionador">
            <h1 className="text-sm sm:text-base font-extrabold text-[#F5EFEA] mb-6">
              Perfil do colecionador
            </h1>

            <form
              onSubmit={handleSaveAll}
              noValidate
              className="flex flex-col gap-6 text-xs"
            >

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">

                <div>
                  <label htmlFor="prof-name" className="block text-[#F5EFEA] mb-1.5">
                    Nome de exibição<span className="text-[#E05844]">*</span>
                  </label>
                  <input
                    id="prof-name"
                    data-testid="prof-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-invalid={Boolean(profileErrors.name)}
                    className="w-full h-9 px-3 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA]"
                  />
                  {profileErrors.name && (
                    <p
                      data-testid="prof-name-error"
                      className="text-[11px] text-[#E05844] mt-1"
                    >
                      {profileErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="prof-username"
                    className="block text-[#F5EFEA] mb-1.5"
                  >
                    Nome de usuário<span className="text-[#E05844]">*</span>
                  </label>
                  <input
                    id="prof-username"
                    data-testid="prof-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    aria-invalid={Boolean(profileErrors.username)}
                    className="w-full h-9 px-3 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA]"
                  />
                  {profileErrors.username && (
                    <p
                      data-testid="prof-username-error"
                      className="text-[11px] text-[#E05844] mt-1"
                    >
                      {profileErrors.username}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="prof-email" className="block text-[#F5EFEA] mb-1.5">
                    E-mail<span className="text-[#E05844]">*</span>
                  </label>
                  <input
                    id="prof-email"
                    data-testid="prof-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={Boolean(profileErrors.email)}
                    className="w-full h-9 px-3 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA]"
                  />
                  {profileErrors.email && (
                    <p
                      data-testid="prof-email-error"
                      className="text-[11px] text-[#E05844] mt-1"
                    >
                      {profileErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="prof-ens" className="block text-[#F5EFEA] mb-1.5">
                    Nome ENS <span className="text-[#E05844]">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      aria-label="Domínio ENS do perfil"
                      value={ensDomain}
                      onChange={(e) => setEnsDomain(e.target.value)}
                      className="w-20 h-9 px-2 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA]"
                    >
                      <option value=".eth">.eth</option>
                      <option value=".art">.art</option>
                      <option value=".sol">.sol</option>
                    </select>
                    <input
                      id="prof-ens"
                      data-testid="prof-ens"
                      type="text"
                      value={ensName}
                      onChange={(e) => setEnsName(e.target.value)}
                      className="flex-1 min-w-0 h-9 px-3 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="prof-wallet-nickname"
                    className="block text-[#F5EFEA] mb-1.5"
                  >
                    Apelido da carteira<span className="text-[#E05844]">*</span>
                  </label>
                  <input
                    id="prof-wallet-nickname"
                    data-testid="prof-wallet-nickname"
                    type="text"
                    value={walletNickname}
                    onChange={(e) => setWalletNickname(e.target.value)}
                    className="w-full h-9 px-3 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA]"
                  />
                </div>

                <div>
                  <span className="block text-[#F5EFEA] mb-1.5">Avatar</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowPresetPicker((v) => !v)}
                      aria-label="Escolher avatar predefinido"
                      className="w-10 h-10 rounded-full bg-[#261A12] border border-[#4E3524] flex items-center justify-center overflow-hidden shrink-0"
                    >
                      {avatar ? (
                        <img
                          src={avatar}
                          alt="Avatar do colecionador"
                          data-testid="prof-avatar-preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-[#CF8A49]" />
                      )}
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileAvatarUpload}
                      className="sr-only"
                    />

                    <button
                      type="button"
                      data-testid="prof-avatar-change"
                      onClick={() => setShowPresetPicker((v) => !v)}
                      className="px-4 h-9 bg-[#CF8A49] hover:bg-[#DF9B5A] text-[#130D09] text-xs font-extrabold rounded transition-colors"
                    >
                      Alterar
                    </button>

                    <button
                      type="button"
                      data-testid="prof-avatar-remove"
                      onClick={() => setAvatar('')}
                      className="text-xs text-[#D7C7B8] hover:text-[#E05844] transition-colors"
                    >
                      Remover
                    </button>
                  </div>

                  {showPresetPicker && (
                    <div className="mt-3 p-3 rounded bg-[#1F150F] border border-[#3C281B] flex flex-wrap items-center gap-2.5">
                      {AVATAR_PRESETS.map((preset) => (
                        <button
                          key={preset.url}
                          type="button"
                          data-testid={`avatar-preset-${preset.label}`}
                          aria-label={`Selecionar avatar ${preset.label}`}
                          onClick={() => setAvatar(preset.url)}
                          className={`w-10 h-10 rounded overflow-hidden border-2 transition-all ${
                            avatar === preset.url
                              ? 'border-[#CF8A49]'
                              : 'border-[#3C281B] opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1.5 rounded border border-[#3C281B] text-[10px] text-[#CF8A49] hover:border-[#CF8A49]"
                      >
                        Upload do computador...
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 pt-2">
                <div className="flex flex-col gap-4">
                  <h2 className="text-sm font-extrabold text-[#F5EFEA]">
                    Alterar senha
                  </h2>

                  <div>
                    <label
                      htmlFor="pwd-current"
                      className="block text-[#F5EFEA] mb-1.5"
                    >
                      Senha atual
                    </label>
                    <div className="relative">
                      <input
                        id="pwd-current"
                        data-testid="pwd-current"
                        type={showCurrentPwd ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        aria-invalid={Boolean(passwordErrors.currentPassword)}
                        className="w-full h-9 pl-3 pr-9 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA]"
                      />
                      <button
                        type="button"
                        aria-label={
                          showCurrentPwd
                            ? 'Ocultar senha atual'
                            : 'Mostrar senha atual'
                        }
                        onClick={() => setShowCurrentPwd((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#CF8A49]"
                      >
                        {showCurrentPwd ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    {passwordErrors.currentPassword && (
                      <p
                        data-testid="pwd-current-error"
                        className="text-[11px] text-[#E05844] mt-1"
                      >
                        {passwordErrors.currentPassword}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="pwd-new" className="block text-[#F5EFEA] mb-1.5">
                      Nova senha
                    </label>
                    <div className="relative">
                      <input
                        id="pwd-new"
                        data-testid="pwd-new"
                        type={showNewPwd ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        aria-invalid={Boolean(passwordErrors.newPassword)}
                        className="w-full h-9 pl-3 pr-9 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA]"
                      />
                      <button
                        type="button"
                        aria-label={
                          showNewPwd ? 'Ocultar nova senha' : 'Mostrar nova senha'
                        }
                        onClick={() => setShowNewPwd((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#CF8A49]"
                      >
                        {showNewPwd ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    {passwordErrors.newPassword && (
                      <p
                        data-testid="pwd-new-error"
                        className="text-[11px] text-[#E05844] mt-1"
                      >
                        {passwordErrors.newPassword}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="pwd-confirm"
                      className="block text-[#F5EFEA] mb-1.5"
                    >
                      Confirmar nova senha
                    </label>
                    <div className="relative">
                      <input
                        id="pwd-confirm"
                        data-testid="pwd-confirm"
                        type={showConfirmPwd ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        aria-invalid={Boolean(passwordErrors.confirmPassword)}
                        className="w-full h-9 pl-3 pr-9 bg-[#18100B] border border-[#3C281B] rounded text-[#F5EFEA]"
                      />
                      <button
                        type="button"
                        aria-label={
                          showConfirmPwd
                            ? 'Ocultar confirmação de senha'
                            : 'Mostrar confirmação de senha'
                        }
                        onClick={() => setShowConfirmPwd((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#CF8A49]"
                      >
                        {showConfirmPwd ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    {passwordErrors.confirmPassword && (
                      <p
                        data-testid="pwd-confirm-error"
                        className="text-[11px] text-[#E05844] mt-1"
                      >
                        {passwordErrors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      data-testid="prof-save-button"
                      disabled={
                        updateProfileMutation.isPending ||
                        changePasswordMutation.isPending
                      }
                      className="px-7 h-9 bg-[#CF8A49] hover:bg-[#DF9B5A] text-[#130D09] text-xs font-extrabold rounded transition-colors"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </section>

          {favoriteItems.length > 0 && (
            <section
              id="favoritos"
              aria-label="Lista de interesse"
              className="pt-6 border-t border-[#3C281B]"
            >
              <h2 className="text-sm font-extrabold text-[#F5EFEA] mb-4">
                Lista de interesse ({favoriteItems.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {favoriteItems.map((nft) => (
                  <div
                    key={nft.id}
                    data-testid={`profile-fav-${nft.id}`}
                    className="bg-[#1F150F] border border-[#3C281B] rounded-lg p-3 flex flex-col justify-between relative"
                  >
                    <button
                      type="button"
                      aria-label={`Remover ${nft.name} dos favoritos`}
                      onClick={() =>
                        toggleFavoriteMutation.mutate({ nft, isFavorite: true })
                      }
                      className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#130D09]/80 text-[#CF8A49] flex items-center justify-center"
                    >
                      <Heart className="w-3.5 h-3.5 fill-[#CF8A49]" />
                    </button>
                    <Link to="/nft/$nftId" params={{ nftId: nft.id }}>
                      <div className="aspect-square rounded bg-[#E5DEC9] overflow-hidden mb-2">
                        <img
                          src={nft.image}
                          alt={nft.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-xs font-bold text-[#F5EFEA] truncate">
                        {nft.name}
                      </p>
                      <p className="text-xs font-extrabold text-[#CF8A49]">
                        {nft.priceEth} ETH
                      </p>
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {orders.length > 0 && (
            <section
              aria-label="Seus pedidos"
              className="pt-6 border-t border-[#3C281B]"
            >
              <h2 className="text-sm font-extrabold text-[#F5EFEA] mb-4">
                Seus pedidos ({orders.length})
              </h2>
              <div className="flex flex-col gap-2.5 text-xs">
                {orders.map((ord) => (
                  <Link
                    key={ord.id}
                    to="/orders/$orderId"
                    params={{ orderId: ord.id }}
                    className="bg-[#1F150F] border border-[#3C281B] hover:border-[#CF8A49] rounded-lg p-3.5 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-[#F5EFEA]">
                        Pedido #{ord.id}
                      </span>
                      <span className="ml-3 text-[#A89688]">
                        {ord.items.length} item(ns) • {ord.network}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-[#CF8A49]">
                        {ord.totalEth} ETH
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          ord.status === 'confirmed'
                            ? 'bg-[#13241B] text-[#4CAF7A]'
                            : ord.status === 'rejected'
                            ? 'bg-[#291210] text-[#E05844]'
                            : 'bg-[#261A12] text-[#CF8A49]'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
};
