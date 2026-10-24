import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import {
  LogIn,
  LogOut,
  Menu,
  Search,
  ShoppingCart,
  User as UserIcon,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCartQuery } from '@/hooks/useQueries';
import { useToast } from '@/contexts/ToastContext';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();
  const { data: cartData } = useCartQuery();
  const { toast } = useToast();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('q') || '';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const totalCartItems = (cartData?.items ?? []).reduce(
    (acc, item) => acc + item.quantity,
    0
  );

  const isHome = location.pathname === '/';
  const isMarket =
    location.pathname.startsWith('/nft') ||
    location.pathname.startsWith('/cart') ||
    location.pathname.startsWith('/checkout') ||
    location.pathname.startsWith('/orders');

  const getCurrentReturnUrl = () =>
    window.location.pathname + window.location.search;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({
      to: '/',
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        q: searchInput.trim() || undefined,
        page: undefined,
      }),
    });
    setMobileMenuOpen(false);
  };

  const handleOutOfScopeNav = (tela: string) => {
    setMobileMenuOpen(false);
    toast({
      title: `Tela ${tela} fora do escopo do desafio`,
    });
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#130D09]/95 backdrop-blur border-b border-[#3C281B]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={
              mobileMenuOpen ? 'Fechar menu' : 'Abrir menu de navegação'
            }
            aria-expanded={mobileMenuOpen}
            className="md:hidden p-2 text-[#F5EFEA] hover:text-[#CF8A49]"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
          <Link
            to="/"
            className="text-sm sm:text-base font-extrabold tracking-[0.22em] text-[#F5EFEA] hover:text-[#CF8A49] transition-colors"
          >
            KURIO
          </Link>
        </div>

        <nav
          aria-label="Navegação principal"
          className="hidden md:flex items-center gap-8 h-full text-xs font-medium"
        >
          <Link
            to="/"
            className={`h-full flex items-center border-b-2 transition-colors px-1 ${
              isHome
                ? 'border-[#CF8A49] text-[#CF8A49]'
                : 'border-transparent text-[#F5EFEA] hover:text-[#CF8A49]'
            }`}
          >
            Início
          </Link>
          <Link
            to="/"
            hash="catalogo"
            className={`h-full flex items-center border-b-2 transition-colors px-1 ${
              isMarket
                ? 'border-[#CF8A49] text-[#CF8A49]'
                : 'border-transparent text-[#F5EFEA] hover:text-[#CF8A49]'
            }`}
          >
            Mercado
          </Link>
          <button
            type="button"
            onClick={() => handleOutOfScopeNav('Criadores')}
            className="h-full flex items-center border-b-2 border-transparent text-[#F5EFEA] hover:text-[#CF8A49] transition-colors px-1"
          >
            Criadores
          </button>
          <button
            type="button"
            onClick={() => handleOutOfScopeNav('Aprenda')}
            className="h-full flex items-center border-b-2 border-transparent text-[#F5EFEA] hover:text-[#CF8A49] transition-colors px-1"
          >
            Aprenda
          </button>
        </nav>

        <div className="flex items-center gap-3 sm:gap-4">
          {searchOpen ? (
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center gap-1.5"
            >
              <label htmlFor="navbar-search-input" className="sr-only">
                Buscar NFTs no catálogo
              </label>
              <input
                id="navbar-search-input"
                data-testid="navbar-search-input"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar NFT, coleção..."
                autoFocus
                className="w-36 sm:w-52 h-8 px-2.5 text-xs bg-[#1F150F] border border-[#CF8A49] rounded text-[#F5EFEA] placeholder-[#7B695B]"
              />
              <button
                type="submit"
                aria-label="Confirmar busca"
                className="px-2 h-8 bg-[#CF8A49] text-[#130D09] text-xs font-bold rounded hover:bg-[#DF9B5A]"
              >
                Ir
              </button>
              <button
                type="button"
                aria-label="Fechar busca"
                onClick={() => setSearchOpen(false)}
                className="p-1 text-[#A89688] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              data-testid="navbar-search-toggle"
              aria-label="Abrir busca de NFTs"
              onClick={() => setSearchOpen(true)}
              className="p-1.5 text-[#F5EFEA] hover:text-[#CF8A49] transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          <Link
            to="/cart"
            data-testid="navbar-cart-link"
            aria-label={`Carrinho de NFTs com ${totalCartItems} itens`}
            className="relative p-1.5 text-[#F5EFEA] hover:text-[#CF8A49] transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span
              data-testid="navbar-cart-badge"
              className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#CF8A49] text-[#130D09] text-[10px] font-extrabold flex items-center justify-center"
            >
              {totalCartItems}
            </span>
          </Link>

          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                data-testid="navbar-profile-link"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded bg-[#CF8A49] hover:bg-[#DF9B5A] text-[#130D09] text-xs font-bold transition-colors"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span className="max-w-[96px] truncate">
                  {user.name.split(' ')[0]}
                </span>
              </Link>
              <Link
                to="/wallets"
                data-testid="navbar-wallets-link"
                aria-label="Minhas carteiras"
                title="Carteiras"
                className="p-1.5 rounded border border-[#3C281B] text-[#A89688] hover:text-[#CF8A49] hover:border-[#CF8A49] transition-colors"
              >
                <Wallet className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                data-testid="navbar-logout-button"
                aria-label="Sair da conta"
                title="Sair"
                onClick={async () => {
                  await logout();
                  navigate({ to: '/' });
                }}
                className="p-1.5 rounded border border-[#3C281B] text-[#A89688] hover:text-[#E05844] hover:border-[#E05844] transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              data-testid="navbar-login-button"
              onClick={() => openAuthModal('login', getCurrentReturnUrl())}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded bg-[#CF8A49] hover:bg-[#DF9B5A] text-[#130D09] text-xs font-bold transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar</span>
            </button>
          )}
        </div>
      </div>

      {mobileMenuOpen && (
        <nav
          aria-label="Menu mobile"
          className="md:hidden bg-[#1F150F] border-b border-[#3C281B] px-4 py-4 flex flex-col gap-2.5 text-xs"
        >
          <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-1">
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar NFTs..."
              aria-label="Buscar NFTs"
              className="flex-1 h-9 px-3 bg-[#130D09] border border-[#3C281B] rounded text-xs text-[#F5EFEA]"
            />
            <button
              type="submit"
              className="px-3 h-9 bg-[#CF8A49] text-[#130D09] font-bold rounded"
            >
              Buscar
            </button>
          </form>

          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="py-1.5 text-[#F5EFEA] hover:text-[#CF8A49]"
          >
            Início
          </Link>

          <Link
            to="/"
            hash="catalogo"
            onClick={() => setMobileMenuOpen(false)}
            className="py-1.5 text-[#F5EFEA] hover:text-[#CF8A49]"
          >
            Mercado
          </Link>

          <button
            type="button"
            onClick={() => handleOutOfScopeNav('Criadores')}
            className="py-1.5 text-left text-[#F5EFEA] hover:text-[#CF8A49]"
          >
            Criadores
          </button>

          <button
            type="button"
            onClick={() => handleOutOfScopeNav('Aprenda')}
            className="py-1.5 text-left text-[#F5EFEA] hover:text-[#CF8A49]"
          >
            Aprenda
          </button>

          <Link
            to="/cart"
            onClick={() => setMobileMenuOpen(false)}
            className="py-1.5 text-[#F5EFEA] hover:text-[#CF8A49]"
          >
            Carrinho ({totalCartItems})
          </Link>

          <Link
            to="/checkout"
            onClick={() => setMobileMenuOpen(false)}
            className="py-1.5 text-[#F5EFEA] hover:text-[#CF8A49]"
          >
            Pagamento
          </Link>

          <div className="border-t border-[#3C281B] my-1 pt-2 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1.5 text-[#F5EFEA] hover:text-[#CF8A49]"
                >
                  Perfil do colecionador
                </Link>
                <Link
                  to="/wallets"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-1.5 text-[#F5EFEA] hover:text-[#CF8A49]"
                >
                  Carteiras
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await logout();
                    navigate({ to: '/' });
                  }}
                  className="py-1.5 text-left text-[#E05844] font-bold"
                >
                  Sair da conta
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal('login', getCurrentReturnUrl());
                  }}
                  className="py-1.5 text-left text-[#CF8A49] font-bold"
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal('register', getCurrentReturnUrl());
                  }}
                  className="py-1.5 text-left text-[#D7C7B8] hover:text-[#CF8A49]"
                >
                  Criar conta
                </button>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};
