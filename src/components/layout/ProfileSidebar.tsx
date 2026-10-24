import React from 'react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import {
  AlertTriangle,
  Download,
  Heart,
  LogOut,
  MapPin,
  ShoppingCart,
  TrendingUp,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export const ProfileSidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { toast } = useToast();

  const isProfile = location.pathname === '/profile';
  const isWallets = location.pathname === '/wallets';

  const handleOutOfScopeClick = (tela: string) => {
    toast({
      title: `Tela ${tela} fora do escopo do desafio`,
    });
  };

  return (
    <aside
      aria-label="Menu do perfil do colecionador"
      className="w-full lg:w-64 shrink-0 bg-[#1F150F] border border-[#3C281B] rounded-lg py-5 flex flex-col justify-between self-start"
    >
      <div>
        <h2 className="px-5 text-sm font-bold text-[#F5EFEA] mb-4">
          Meu perfil
        </h2>

        <nav className="flex flex-col text-xs">
          <Link
            to="/profile"
            data-testid="sidebar-link-profile"
            className={`flex items-center gap-3 px-5 py-2.5 border-l-4 transition-colors ${
              isProfile
                ? 'border-[#CF8A49] text-[#CF8A49] bg-[#261A12] font-bold'
                : 'border-transparent text-[#D7C7B8] hover:text-[#CF8A49]'
            }`}
          >
            <UserIcon className="w-4 h-4 shrink-0 text-[#CF8A49]" />
            <span>Dados do perfil</span>
          </Link>

          <Link
            to="/wallets"
            data-testid="sidebar-link-wallets"
            className={`flex items-center gap-3 px-5 py-2.5 border-l-4 transition-colors ${
              isWallets
                ? 'border-[#CF8A49] text-[#CF8A49] bg-[#261A12] font-bold'
                : 'border-transparent text-[#D7C7B8] hover:text-[#CF8A49]'
            }`}
          >
            <MapPin className="w-4 h-4 shrink-0 text-[#CF8A49]" />
            <span>Carteiras</span>
          </Link>

          <button
            type="button"
            onClick={() => handleOutOfScopeClick('Atividade')}
            className="flex items-center gap-3 px-5 py-2.5 border-l-4 border-transparent text-[#D7C7B8] hover:text-[#CF8A49] text-left transition-colors"
          >
            <ShoppingCart className="w-4 h-4 shrink-0 text-[#CF8A49]" />
            <span>Atividade</span>
          </button>

          <Link
            to="/profile"
            hash="favoritos"
            className="flex items-center gap-3 px-5 py-2.5 border-l-4 border-transparent text-[#D7C7B8] hover:text-[#CF8A49] transition-colors"
          >
            <Heart className="w-4 h-4 shrink-0 text-[#CF8A49]" />
            <span>Lista de interesse</span>
          </Link>

          <button
            type="button"
            onClick={() => handleOutOfScopeClick('Ofertas')}
            className="flex items-center gap-3 px-5 py-2.5 border-l-4 border-transparent text-[#D7C7B8] hover:text-[#CF8A49] text-left transition-colors"
          >
            <TrendingUp className="w-4 h-4 shrink-0 text-[#CF8A49]" />
            <span>Ofertas</span>
          </button>

          <button
            type="button"
            onClick={() => handleOutOfScopeClick('Arquivos baixados')}
            className="flex items-center gap-3 px-5 py-2.5 border-l-4 border-transparent text-[#D7C7B8] hover:text-[#CF8A49] text-left transition-colors"
          >
            <Download className="w-4 h-4 shrink-0 text-[#CF8A49]" />
            <span>Arquivos baixados</span>
          </button>

          <button
            type="button"
            onClick={() => handleOutOfScopeClick('Suporte')}
            className="flex items-center gap-3 px-5 py-2.5 border-l-4 border-transparent text-[#D7C7B8] hover:text-[#CF8A49] text-left transition-colors"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#CF8A49]" />
            <span>Suporte</span>
          </button>
        </nav>
      </div>

      <div className="mt-4 pt-3 border-t border-[#3C281B] px-5">
        <button
          type="button"
          data-testid="sidebar-logout-button"
          onClick={async () => {
            await logout();
            navigate({ to: '/' });
          }}
          className="flex items-center gap-3 py-1.5 text-xs font-bold text-[#CF8A49] hover:text-[#DF9B5A] transition-colors w-full text-left"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
};
