import React, { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useNavigate } from '@tanstack/react-router';
import { Eye, EyeOff, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { extractApiError } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

interface AuthFormContentProps {
  initialMode: 'login' | 'register';
  returnTo?: string;
  expiredMessage?: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

export const AuthFormContent: React.FC<AuthFormContentProps> = ({
  initialMode,
  returnTo,
  expiredMessage,
  onSuccess,
  onClose,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const { login, register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(
    expiredMessage || null
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (expiredMessage) setGeneralError(expiredMessage);
  }, [expiredMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    const localErrors: Record<string, string> = {};
    if (mode === 'register') {
      if (!username.trim() || username.trim().length < 3) {
        localErrors.username = 'Informe um nome de usuário (mín. 3 caracteres).';
      }
      if (confirmPassword && password !== confirmPassword) {
        localErrors.confirmPassword = 'As senhas informadas não conferem.';
      }
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      localErrors.email = 'Informe um e-mail válido.';
    }
    if (!password || password.length < 6) {
      localErrors.password = 'A senha deve ter pelo menos 6 caracteres.';
    }

    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        const user = await login({ email, password });
        toast({
          title: `Bem-vindo de volta, ${user.name}!`,
          description: 'Sessão iniciada com sucesso.',
          variant: 'success',
        });
      } else {
        const cleanUsername = username.trim();
        const user = await register({
          name: cleanUsername,
          username: cleanUsername,
          email,
          password,
          confirmPassword,
        });
        toast({
          title: `Conta criada, ${user.name}!`,
          description: 'Seu cadastro na Kurio foi concluído.',
          variant: 'success',
        });
      }
      onSuccess?.();
      if (returnTo && returnTo !== '/login' && returnTo !== '/register') {
        navigate({ to: returnTo as any });
      }
    } catch (err) {
      const apiErr = extractApiError(err);
      setGeneralError(apiErr.message);
      if (apiErr.fieldErrors) {
        setFieldErrors(apiErr.fieldErrors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSocialDemoLogin = async (demoEmail: string) => {
    setSubmitting(true);
    setGeneralError(null);
    try {
      const user = await login({ email: demoEmail, password: 'Kurio@2026' });
      toast({
        title: `Conectado como ${user.name}`,
        description: 'Autenticação social simulada com sucesso.',
        variant: 'success',
      });
      onSuccess?.();
      if (returnTo && returnTo !== '/login' && returnTo !== '/register') {
        navigate({ to: returnTo as any });
      }
    } catch (err) {
      setGeneralError(extractApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[380px] bg-[#160F0A] sm:bg-[#21160F] border border-[#3C281B] sm:border-b-[6px] sm:border-b-[#CF8A49] rounded-2xl sm:rounded-sm p-6 sm:p-8 shadow-2xl text-[#F5EFEA] relative">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar janela de autenticação"
          className="absolute top-3.5 right-3.5 text-[#CF8A49] hover:text-white p-1"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="sm:hidden text-center pt-2 pb-6">
        <div className="text-xl font-extrabold tracking-[0.25em] text-[#F5EFEA] mb-6">
          KURIO
        </div>
        <h2 className="text-lg font-extrabold text-[#F5EFEA]">
          {mode === 'login' ? 'Entrar' : 'Criar conta'}
        </h2>
        {mode === 'register' && (
          <p className="text-xs text-[#D7C7B8] leading-relaxed max-w-[260px] mx-auto mt-3">
            Crie seu perfil de colecionador e conecte uma carteira quando quiser.
          </p>
        )}
      </div>

      <div className="hidden sm:block text-center mb-5">
        <div className="inline-flex items-center justify-center gap-2.5 text-sm font-extrabold mb-3">
          <button
            type="button"
            data-testid="auth-tab-login"
            onClick={() => {
              setMode('login');
              setGeneralError(null);
              setFieldErrors({});
            }}
            className={`transition-colors ${
              mode === 'login'
                ? 'text-[#CF8A49]'
                : 'text-[#F5EFEA] hover:text-[#CF8A49]'
            }`}
          >
            Entrar
          </button>
          <span className="text-[#CF8A49] font-normal">|</span>
          <button
            type="button"
            data-testid="auth-tab-register"
            onClick={() => {
              setMode('register');
              setGeneralError(null);
              setFieldErrors({});
            }}
            className={`transition-colors ${
              mode === 'register'
                ? 'text-[#CF8A49]'
                : 'text-[#F5EFEA] hover:text-[#CF8A49]'
            }`}
          >
            Criar conta
          </button>
        </div>

        <p className="text-[11px] text-[#D7C7B8] leading-relaxed max-w-[280px] mx-auto">
          {mode === 'login'
            ? 'Entre para gerenciar sua carteira, coleção e perfil de criador.'
            : 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'}
        </p>
      </div>

      {generalError && (
        <div
          role="alert"
          data-testid="auth-error-banner"
          className="mb-4 p-2.5 rounded bg-[#291210] border border-[#E05844] text-[11px] text-[#F5EFEA]"
        >
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 text-xs">
        {mode === 'register' && (
          <div>
            <label htmlFor="auth-username" className="sr-only">
              Nome de usuário
            </label>
            <input
              id="auth-username"
              data-testid="auth-username-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nome de usuário"
              aria-invalid={Boolean(fieldErrors.username || fieldErrors.name)}
              className="w-full h-11 sm:h-9 px-3.5 sm:px-3 bg-[#1A110B] border border-[#4E3524] rounded-xl sm:rounded text-xs text-[#F5EFEA] placeholder-[#A89688] text-center sm:text-left"
            />
            {(fieldErrors.username || fieldErrors.name) && (
              <p className="text-[11px] text-[#E05844] mt-1">
                {fieldErrors.username || fieldErrors.name}
              </p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="auth-email" className="sr-only">
            E-mail
          </label>
          <input
            id="auth-email"
            data-testid="auth-email-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={
              mode === 'login' ? 'contato@email.com' : 'Digite seu e-mail'
            }
            aria-invalid={Boolean(fieldErrors.email)}
            className="w-full h-11 sm:h-9 px-3.5 sm:px-3 bg-[#1A110B] border border-[#4E3524] rounded-xl sm:rounded text-xs text-[#F5EFEA] placeholder-[#A89688]"
          />
          {fieldErrors.email && (
            <p className="text-[11px] text-[#E05844] mt-1">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="auth-password" className="sr-only">
            Senha
          </label>
          <div className="relative">
            <input
              id="auth-password"
              data-testid="auth-password-input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'login' ? '***********' : 'Senha'}
              aria-invalid={Boolean(fieldErrors.password)}
              className="w-full h-11 sm:h-9 pl-3.5 sm:pl-3 pr-9 bg-[#1A110B] border border-[#4E3524] focus:border-[#CF8A49] rounded-xl sm:rounded text-xs text-[#F5EFEA] placeholder-[#A89688]"
            />
            <button
              type="button"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#CF8A49] hover:text-[#F5EFEA]"
            >
              {showPassword ? (
                <Eye className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              ) : (
                <EyeOff className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              )}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="text-[11px] text-[#E05844] mt-1">
              {fieldErrors.password}
            </p>
          )}
        </div>

        {mode === 'login' && (
          <div className="text-right -mt-0.5">
            <button
              type="button"
              onClick={() =>
                toast({
                  title: 'Recuperação de senha simulada',
                  description:
                    'Use a senha de demonstração Kurio@2026 para acessar as contas.',
                })
              }
              className="text-[11px] sm:text-[10px] text-[#CF8A49] hover:underline"
            >
              Esqueceu a senha?
            </button>
          </div>
        )}

        {mode === 'register' && (
          <div>
            <label htmlFor="auth-confirm-password" className="sr-only">
              Confirmar senha
            </label>
            <div className="relative">
              <input
                id="auth-confirm-password"
                data-testid="auth-confirm-password-input"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmar senha"
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                className="w-full h-11 sm:h-9 pl-3.5 sm:pl-3 pr-9 bg-[#1A110B] border border-[#4E3524] rounded-xl sm:rounded text-xs text-[#F5EFEA] placeholder-[#A89688]"
              />
              <button
                type="button"
                aria-label={
                  showConfirmPassword
                    ? 'Ocultar confirmação de senha'
                    : 'Mostrar confirmação de senha'
                }
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#CF8A49] hover:text-[#F5EFEA]"
              >
                {showConfirmPassword ? (
                  <Eye className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                ) : (
                  <EyeOff className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                )}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="text-[11px] text-[#E05844] mt-1">
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          data-testid="auth-submit-button"
          disabled={submitting}
          className="mt-2 w-full h-11 sm:h-9 bg-[#CF8A49] hover:bg-[#DF9B5A] disabled:opacity-60 text-[#130D09] text-xs font-extrabold rounded-xl sm:rounded transition-colors"
        >
          {submitting
            ? 'Processando...'
            : mode === 'login'
            ? 'Entrar'
            : 'Criar perfil'}
        </button>
      </form>

      <div className="relative my-5 flex items-center justify-center">
        <div className="border-t border-[#4E3524] w-full" />
        <span className="bg-[#160F0A] sm:bg-[#21160F] px-3 text-[11px] sm:text-[10px] text-[#D7C7B8] whitespace-nowrap">
          Ou continue com
        </span>
        <div className="border-t border-[#4E3524] w-full" />
      </div>

      <div className="flex flex-col gap-2.5 text-[11px]">
        <button
          type="button"
          data-testid="auth-google-button"
          onClick={() => handleSocialDemoLogin('colecionador@kurio.art')}
          className="w-full h-10 sm:h-9 px-3 rounded-lg sm:rounded border border-[#4E3524] bg-[#1A110B] hover:border-[#CF8A49] text-[#D7C7B8] flex items-center justify-center gap-2 transition-colors"
        >
          <span className="font-extrabold text-[#4285F4]">G</span>
          <span>Continuar com Google</span>
        </button>

        <button
          type="button"
          data-testid="auth-facebook-button"
          onClick={() => handleSocialDemoLogin('artista@kurio.art')}
          className="w-full h-10 sm:h-9 px-3 rounded-lg sm:rounded border border-[#4E3524] bg-[#1A110B] hover:border-[#CF8A49] text-[#D7C7B8] flex items-center justify-center gap-2 transition-colors"
        >
          <span className="font-extrabold text-[#1877F2]">f</span>
          <span>Continuar com Facebook</span>
        </button>
      </div>

      <div className="sm:hidden text-center mt-6">
        {mode === 'login' ? (
          <button
            type="button"
            data-testid="auth-tab-register"
            onClick={() => {
              setMode('register');
              setGeneralError(null);
              setFieldErrors({});
            }}
            className="text-xs text-[#D7C7B8] hover:text-[#CF8A49]"
          >
            Novo na Kurio? <span className="underline">Crie uma conta</span>
          </button>
        ) : (
          <button
            type="button"
            data-testid="auth-tab-login"
            onClick={() => {
              setMode('login');
              setGeneralError(null);
              setFieldErrors({});
            }}
            className="text-xs text-[#D7C7B8] hover:text-[#CF8A49]"
          >
            Já tem uma conta? <span className="underline">Entre</span>
          </button>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[#3C281B] flex items-center justify-between text-[10px] text-[#A89688]">
        <span>Preencher demo:</span>
        <div className="flex gap-2">
          <button
            type="button"
            data-testid="auth-fill-collector"
            onClick={() => {
              setMode('login');
              setEmail('colecionador@kurio.art');
              setPassword('Kurio@2026');
            }}
            className="text-[#CF8A49] hover:underline font-bold"
          >
            Colecionador 1
          </button>
          <span>•</span>
          <button
            type="button"
            data-testid="auth-fill-artist"
            onClick={() => {
              setMode('login');
              setEmail('artista@kurio.art');
              setPassword('Kurio@2026');
            }}
            className="text-[#CF8A49] hover:underline font-bold"
          >
            Colecionador 2
          </button>
        </div>
      </div>
    </div>
  );
};

export const AuthModal: React.FC = () => {
  const { authModal, closeAuthModal } = useAuth();

  return (
    <Dialog.Root
      open={authModal.isOpen}
      onOpenChange={(open) => {
        if (!open) closeAuthModal();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          <Dialog.Title className="sr-only">
            {authModal.mode === 'login' ? 'Entrar na Kurio' : 'Criar conta na Kurio'}
          </Dialog.Title>
          <AuthFormContent
            initialMode={authModal.mode}
            returnTo={authModal.returnTo}
            expiredMessage={authModal.expiredMessage}
            onSuccess={closeAuthModal}
            onClose={closeAuthModal}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
