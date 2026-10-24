import React, { useEffect } from 'react';
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { AuthModal } from '@/components/layout/AuthModal';
import { SimulationToolbar } from '@/components/layout/SimulationToolbar';
import { HomePage } from '@/pages/HomePage';
import { NftDetailPage } from '@/pages/NftDetailPage';
import { CartPage } from '@/pages/CartPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { OrderConfirmationPage } from '@/pages/OrderConfirmationPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { WalletsPage } from '@/pages/WalletsPage';
import { LoginPage, NotFoundPage, RegisterPage } from '@/pages/AuthPages';
import { initRealtimeSocket } from '@/services/realtime';
import { CatalogTab, SortOption } from '@/types/contracts';

const RootLayout: React.FC = () => {
  useEffect(() => {
    const socket = initRealtimeSocket();
    return () => {

      void socket;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#130D09] text-[#F5EFEA]">
      <Navbar />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
      <AuthModal />
      <SimulationToolbar />
    </div>
  );
};

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});

export interface HomeSearchParams {
  q?: string;
  categories?: string;
  networks?: string;
  minPrice?: string;
  maxPrice?: string;
  tab?: CatalogTab;
  sort?: SortOption;
  page?: number;
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search: Record<string, unknown>): HomeSearchParams => {
    const out: HomeSearchParams = {};
    if (typeof search.q === 'string' && search.q) out.q = search.q;
    if (typeof search.categories === 'string' && search.categories)
      out.categories = search.categories;
    if (typeof search.networks === 'string' && search.networks)
      out.networks = search.networks;
    if (typeof search.minPrice === 'string' && search.minPrice)
      out.minPrice = search.minPrice;
    if (typeof search.maxPrice === 'string' && search.maxPrice)
      out.maxPrice = search.maxPrice;
    if (
      search.tab === 'new' ||
      search.tab === 'trending' ||
      search.tab === 'all'
    ) {
      out.tab = search.tab as CatalogTab;
    }
    if (
      search.sort === 'price_asc' ||
      search.sort === 'price_desc' ||
      search.sort === 'popular' ||
      search.sort === 'recent'
    ) {
      out.sort = search.sort as SortOption;
    }
    if (search.page !== undefined && Number(search.page) > 1) {
      out.page = Number(search.page);
    }
    return out;
  },
  component: HomePage,
});

const nftDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nft/$nftId',
  component: NftDetailPage,
});

const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cart',
  component: CartPage,
});

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkout',
  component: CheckoutPage,
});

const orderConfirmationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/orders/$orderId',
  component: OrderConfirmationPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: ProfilePage,
});

const walletsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/wallets',
  component: WalletsPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search: Record<string, unknown>): { returnTo?: string } => ({
    ...(typeof search.returnTo === 'string' ? { returnTo: search.returnTo } : {}),
  }),
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  validateSearch: (search: Record<string, unknown>): { returnTo?: string } => ({
    ...(typeof search.returnTo === 'string' ? { returnTo: search.returnTo } : {}),
  }),
  component: RegisterPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  nftDetailRoute,
  cartRoute,
  checkoutRoute,
  orderConfirmationRoute,
  profileRoute,
  walletsRoute,
  loginRoute,
  registerRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
