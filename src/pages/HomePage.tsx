import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Filter,
  Heart,
  RefreshCw,
  Search,
  ShoppingCart,
  X,
} from 'lucide-react';
import {
  CatalogTab,
  NFT,
  NFTCategory,
  SortOption,
  WalletNetwork,
} from '@/types/contracts';
import {
  useAddCartItemMutation,
  useFavoritesQuery,
  useNftsQuery,
  useToggleFavoriteMutation,
} from '@/hooks/useQueries';
import { CatalogGridSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { extractApiError } from '@/services/api';

const ALL_CATEGORIES: { name: NFTCategory; count: number }[] = [
  { name: 'Arte 3D', count: 34 },
  { name: 'Arte digital', count: 18 },
  { name: 'Avatares', count: 13 },
  { name: 'Colecionáveis', count: 12 },
  { name: 'Fotografia', count: 12 },
  { name: 'Generativa', count: 17 },
  { name: 'Jogos', count: 15 },
  { name: 'Música', count: 23 },
  { name: 'Utilidade', count: 16 },
];

const ALL_NETWORKS: { name: WalletNetwork; count: number }[] = [
  { name: 'Ethereum', count: 210 },
  { name: 'Polygon', count: 94 },
  { name: 'Solana', count: 62 },
];

const HERO_SLIDES = [
  {
    id: 'emerald-ape-042',
    badge: 'Bem-vindo à Kurio',
    title: 'SEJA DONO DO FUTURO DA ARTE DIGITAL',
    description:
      'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.',
    image: '/assets/nfts/emerald-ape.png',
    alt: 'Emerald Ape #042 — Macaco usando óculos redondos verdes e jaqueta esmeralda',
  },
  {
    id: 'sage-nomad-009',
    badge: 'Coleção Verificada',
    title: 'EDIÇÕES GÊNESIS COM PROCEDÊNCIA IMUTÁVEL',
    description:
      'Obras digitais numeradas e registradas na Ethereum com direitos de colecionador e arquivos em alta resolução desbloqueáveis.',
    image: '/assets/nfts/purple-ape.png',
    alt: 'Sage Nomad #009 — Macaco usando chapéu bucket verde e moletom roxo',
  },
  {
    id: 'ivory-baron-088',
    badge: 'Curadoria Kurio',
    title: 'ARTE 3D E AVATARES DE ALTA RARIDADE',
    description:
      'Conecte sua carteira, explore atributos verificados no IPFS e participe dos próximos lançamentos exclusivos.',
    image: '/assets/nfts/ivory-ape.png',
    alt: 'Ivory Baron #088 — Macaco com blazer marfim e gola alta verde',
  },
];

const BLOG_POSTS = [
  {
    id: 'post-1',
    date: '12 de outubro',
    readTime: 'Leitura de 4 min',
    title: 'Como funciona a propriedade de NFTs',
    excerpt: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    image: '/assets/nfts/ivory-ape.png',
  },
  {
    id: 'post-2',
    date: '15 de outubro',
    readTime: 'Leitura de 5 min',
    title: '10 artistas digitais para acompanhar',
    excerpt: 'Conheça criadores que moldam a cultura digital.',
    image: '/assets/nfts/emerald-ape.png',
  },
  {
    id: 'post-3',
    date: '18 de outubro',
    readTime: 'Leitura de 3 min',
    title: 'Raridade, atributos e procedência',
    excerpt: 'Entenda edições, procedência, direitos autorais e utilidade.',
    image: '/assets/nfts/purple-ape.png',
  },
  {
    id: 'post-4',
    date: '20 de outubro',
    readTime: 'Leitura de 6 min',
    title: 'Como proteger sua carteira',
    excerpt: 'Proteja sua carteira, suas chaves e sua identidade.',
    image: '/assets/nfts/golden-ape.png',
  },
];

export const HomePage: React.FC = () => {
  const search = useSearch({ strict: false }) as {
    q?: string;
    categories?: string;
    networks?: string;
    minPrice?: string;
    maxPrice?: string;
    tab?: CatalogTab;
    sort?: SortOption;
    page?: number;
  };
  const navigate = useNavigate();
  const { isAuthenticated, openAuthModal } = useAuth();
  const { toast } = useToast();

  const [heroIndex, setHeroIndex] = useState(0);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const selectedCategories: NFTCategory[] = search.categories
    ? (search.categories.split(',').filter(Boolean) as NFTCategory[])
    : [];
  const selectedNetworks: WalletNetwork[] = search.networks
    ? (search.networks.split(',').filter(Boolean) as WalletNetwork[])
    : [];
  const activeTab: CatalogTab = search.tab || 'all';
  const activeSort: SortOption = search.sort || 'recent';
  const currentPage = Number(search.page || 1);
  const searchQuery = search.q || '';

  const [filterSearchInput, setFilterSearchInput] = useState(searchQuery);
  const [minPriceInput, setMinPriceInput] = useState(search.minPrice || '');
  const [maxPriceInput, setMaxPriceInput] = useState(search.maxPrice || '');

  useEffect(() => {
    setFilterSearchInput(search.q || '');
  }, [search.q]);

  useEffect(() => {
    setMinPriceInput(search.minPrice || '');
    setMaxPriceInput(search.maxPrice || '');
  }, [search.minPrice, search.maxPrice]);

  const queryParams = {
    q: searchQuery || undefined,
    categories: selectedCategories,
    networks: selectedNetworks,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    tab: activeTab,
    sort: activeSort,
    page: currentPage,
    limit: 9,
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useNftsQuery(queryParams);
  const { data: favoritesData } = useFavoritesQuery();
  const toggleFavoriteMutation = useToggleFavoriteMutation();
  const addCartItemMutation = useAddCartItemMutation();

  const favoriteIds = favoritesData?.ids ?? [];
  const hasCatalogItems = Boolean(!isLoading && !isError && data && data.items.length > 0);

  const updateUrlParams = (updates: Record<string, unknown>, resetPage = true) => {
    navigate({
      to: '/',
      search: (prev: Record<string, unknown>) => {
        const next: Record<string, unknown> = {
          ...prev,
          ...updates,
          page: resetPage ? 1 : updates.page ?? prev.page ?? 1,
        };
        for (const key of Object.keys(next)) {
          if (
            next[key] === undefined ||
            next[key] === '' ||
            (key === 'tab' && next[key] === 'all') ||
            (key === 'sort' && next[key] === 'recent') ||
            (key === 'page' && Number(next[key]) === 1)
          ) {
            delete next[key];
          }
        }
        return next;
      },
    });
  };

  const toggleCategory = (cat: NFTCategory) => {
    const exists = selectedCategories.includes(cat);
    const next = exists
      ? selectedCategories.filter((c) => c !== cat)
      : [...selectedCategories, cat];
    updateUrlParams({ categories: next.length ? next.join(',') : undefined }, true);
  };

  const toggleNetwork = (net: WalletNetwork) => {
    const exists = selectedNetworks.includes(net);
    const next = exists
      ? selectedNetworks.filter((n) => n !== net)
      : [...selectedNetworks, net];
    updateUrlParams({ networks: next.length ? next.join(',') : undefined }, true);
  };

  const handleApplyFilterSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrlParams({ q: filterSearchInput.trim() || undefined }, true);
  };

  const handleApplyPriceFilter = () => {
    const parsedMin = minPriceInput.trim().replace(',', '.');
    const parsedMax = maxPriceInput.trim().replace(',', '.');
    const minVal = parsedMin && !Number.isNaN(Number(parsedMin)) ? Number(parsedMin) : undefined;
    const maxVal = parsedMax && !Number.isNaN(Number(parsedMax)) ? Number(parsedMax) : undefined;

    updateUrlParams(
      {
        minPrice: minVal !== undefined && minVal >= 0 ? minVal.toFixed(2) : undefined,
        maxPrice: maxVal !== undefined && maxVal > 0 ? maxVal.toFixed(2) : undefined,
      },
      true
    );
  };

  const clearAllFilters = () => {
    setFilterSearchInput('');
    setMinPriceInput('');
    setMaxPriceInput('');
    navigate({ to: '/', search: {} });
  };

  const handleToggleFavorite = (e: React.MouseEvent, nft: NFT) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      openAuthModal('login', window.location.pathname + window.location.search);
      return;
    }
    const isFav = favoriteIds.includes(nft.id);
    toggleFavoriteMutation.mutate({ nft, isFavorite: isFav });
  };

  const currentHero = HERO_SLIDES[heroIndex];

  const filterPanelContent = (
    <div className="flex flex-col gap-6">
      <div className="bg-[#1F150F] border border-[#3C281B] rounded-lg p-5 flex flex-col gap-6">
        <div>
          <label
            htmlFor="filter-search-input"
            className="block text-xs font-bold text-[#F5EFEA] mb-2.5"
          >
            Buscar no catálogo
          </label>
          <form onSubmit={handleApplyFilterSearch} className="flex gap-1.5">
            <input
              id="filter-search-input"
              data-testid="filter-search-input"
              type="search"
              value={filterSearchInput}
              onChange={(e) => {
                setFilterSearchInput(e.target.value);
                if (e.target.value === '') {
                  updateUrlParams({ q: undefined }, true);
                }
              }}
              placeholder="Nome, coleção ou #ID..."
              className="flex-1 min-w-0 h-8 px-2.5 bg-[#130D09] border border-[#3C281B] rounded text-xs text-[#F5EFEA] placeholder-[#7B695B]"
            />
            <button
              type="submit"
              data-testid="filter-search-submit"
              aria-label="Filtrar por busca"
              className="px-2.5 h-8 bg-[#CF8A49] hover:bg-[#DF9B5A] text-[#130D09] rounded flex items-center justify-center transition-colors shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        <div className="pt-4 border-t border-[#3C281B]">
          <h2 className="text-xs font-bold text-[#F5EFEA] mb-3">Coleções</h2>
          <ul className="flex flex-col gap-2 text-xs">
            {ALL_CATEGORIES.map((cat) => {
              const active = selectedCategories.includes(cat.name);
              const count = data?.facets.categories[cat.name] ?? cat.count;
              return (
                <li key={cat.name}>
                  <button
                    type="button"
                    data-testid={`filter-category-${cat.name}`}
                    aria-pressed={active}
                    onClick={() => toggleCategory(cat.name)}
                    className={`w-full flex items-center justify-between py-0.5 text-left transition-colors ${
                      active
                        ? 'text-[#CF8A49] font-bold'
                        : 'text-[#A89688] hover:text-[#F5EFEA]'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span>({count})</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="pt-4 border-t border-[#3C281B]">
          <h2 className="text-xs font-bold text-[#F5EFEA] mb-3">Faixa de preço (ETH)</h2>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label
                htmlFor="filter-min-price"
                className="block text-[10px] text-[#A89688] mb-1"
              >
                Mínimo
              </label>
              <input
                id="filter-min-price"
                data-testid="filter-min-price"
                type="number"
                step="0.01"
                min="0"
                value={minPriceInput}
                onChange={(e) => setMinPriceInput(e.target.value)}
                placeholder="0.02"
                className="w-full h-8 px-2.5 bg-[#130D09] border border-[#3C281B] rounded text-xs text-[#F5EFEA] placeholder-[#7B695B]"
              />
            </div>
            <div>
              <label
                htmlFor="filter-max-price"
                className="block text-[10px] text-[#A89688] mb-1"
              >
                Máximo
              </label>
              <input
                id="filter-max-price"
                data-testid="filter-max-price"
                type="number"
                step="0.01"
                min="0"
                value={maxPriceInput}
                onChange={(e) => setMaxPriceInput(e.target.value)}
                placeholder="15.00"
                className="w-full h-8 px-2.5 bg-[#130D09] border border-[#3C281B] rounded text-xs text-[#F5EFEA] placeholder-[#7B695B]"
              />
            </div>
          </div>

          <p className="text-[11px] text-[#D7C7B8] mb-3">
            Preço:{' '}
            <span className="text-[#CF8A49] font-semibold">
              {(minPriceInput || '0,02').replace('.', ',')} -{' '}
              {(maxPriceInput || '15,00').replace('.', ',')} ETH
            </span>
          </p>

          <button
            type="button"
            data-testid="filter-price-apply"
            onClick={handleApplyPriceFilter}
            className="w-full sm:w-auto px-4 h-8 bg-[#CF8A49] hover:bg-[#DF9B5A] text-[#130D09] text-xs font-bold rounded transition-colors"
          >
            Aplicar
          </button>
        </div>

        <div className="pt-4 border-t border-[#3C281B]">
          <h2 className="text-xs font-bold text-[#F5EFEA] mb-3">Rede</h2>
          <ul className="flex flex-col gap-2 text-xs">
            {ALL_NETWORKS.map((net) => {
              const active = selectedNetworks.includes(net.name);
              const count = data?.facets.networks[net.name] ?? net.count;
              return (
                <li key={net.name}>
                  <button
                    type="button"
                    data-testid={`filter-network-${net.name}`}
                    aria-pressed={active}
                    onClick={() => toggleNetwork(net.name)}
                    className={`w-full flex items-center justify-between py-0.5 text-left transition-colors ${
                      active
                        ? 'text-[#CF8A49] font-bold'
                        : 'text-[#A89688] hover:text-[#F5EFEA]'
                    }`}
                  >
                    <span>{net.name}</span>
                    <span>({count})</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {hasCatalogItems && (
        <Link
          to="/nft/$nftId"
          params={{ nftId: 'sage-nomad-009' }}
          data-testid="featured-nft-card"
          className="block bg-[#1F150F] border border-[#3C281B] hover:border-[#CF8A49] rounded-lg p-5 transition-colors group text-center"
        >
          <p className="text-xs font-extrabold text-[#CF8A49] tracking-wider uppercase">
            NFT EM DESTAQUE
          </p>
          <p className="text-sm font-extrabold text-[#F5EFEA] mt-0.5 mb-3">
            OFERTA LIMITADA
          </p>
          <div className="overflow-hidden rounded-lg aspect-square bg-[#E8E2D5] mx-auto">
            <img
              src="/assets/nfts/purple-ape.png"
              alt="NFT em destaque: Sage Nomad #009"
              width={260}
              height={260}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        </Link>
      )}
    </div>
  );

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-8 pt-6">
      <section
        aria-label="Destaque principal"
        className="bg-[#18100B] border border-[#2C1D13] rounded-xl p-6 sm:p-10 lg:p-12 mb-10 relative overflow-hidden"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 flex flex-col items-start gap-4">
            <span className="text-xs text-[#D7C7B8] font-medium">
              {currentHero.badge}
            </span>
            <h1 className="text-2xl sm:text-4xl lg:text-[40px] font-extrabold text-[#F5EFEA] leading-[1.18] tracking-tight max-w-xl">
              {currentHero.title}
            </h1>
            <p className="text-xs sm:text-sm text-[#A89688] leading-relaxed max-w-lg">
              {currentHero.description}
            </p>
            <div className="mt-3 w-full max-w-lg flex items-center justify-center">
              <Link
                to="/nft/$nftId"
                params={{ nftId: currentHero.id }}
                data-testid="hero-explore-button"
                className="inline-flex items-center justify-center h-10 px-8 bg-[#CF8A49] hover:bg-[#DF9B5A] text-[#130D09] text-xs font-extrabold rounded tracking-wider uppercase transition-colors"
              >
                EXPLORAR
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <Link
              to="/nft/$nftId"
              params={{ nftId: currentHero.id }}
              className="w-full max-w-[360px] aspect-square rounded-2xl overflow-hidden bg-[#DBD3BE] border border-[#3C281B] shadow-2xl block"
            >
              <img
                src={currentHero.image}
                alt={currentHero.alt}
                width={360}
                height={360}
                fetchPriority="high"
                className="w-full h-full object-cover"
              />
            </Link>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Slides de destaque"
          className="flex items-center justify-center gap-2.5 mt-8 lg:mt-10 pt-2"
        >
          {HERO_SLIDES.map((slide, idx) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={heroIndex === idx}
              aria-label={`Destaque ${idx + 1}: ${slide.title}`}
              onClick={() => setHeroIndex(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                heroIndex === idx ? 'bg-[#CF8A49]' : 'bg-[#4E3524] hover:bg-[#CF8A49]/60'
              }`}
            />
          ))}
        </div>
      </section>

      <section id="catalogo" aria-label="Catálogo de NFTs" className="mb-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <aside className="hidden lg:block lg:col-span-3">
            {filterPanelContent}
          </aside>

          <div className="lg:col-span-9 flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#3C281B] pb-3 text-xs">
              <div role="tablist" aria-label="Abas do catálogo" className="flex items-center gap-5">
                {(
                  [
                    { id: 'all', label: 'Todos os NFTs' },
                    { id: 'new', label: 'Novos lançamentos' },
                    { id: 'trending', label: 'Em alta' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    data-testid={`catalog-tab-${t.id}`}
                    aria-selected={activeTab === t.id}
                    onClick={() => updateUrlParams({ tab: t.id }, true)}
                    className={`pb-2 -mb-[13px] border-b-2 transition-colors ${
                      activeTab === t.id
                        ? 'border-[#CF8A49] text-[#CF8A49] font-bold'
                        : 'border-transparent text-[#F5EFEA] hover:text-[#CF8A49]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  data-testid="mobile-filters-button"
                  onClick={() => setMobileFiltersOpen((v) => !v)}
                  className="lg:hidden inline-flex items-center gap-1.5 h-8 px-3 rounded bg-[#1F150F] border border-[#3C281B] text-[#CF8A49] font-bold"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filtros</span>
                </button>

                <div className="flex items-center gap-2">
                  <label htmlFor="catalog-sort-select" className="text-[#A89688]">
                    Ordenar por
                  </label>
                  <select
                    id="catalog-sort-select"
                    data-testid="catalog-sort-select"
                    value={activeSort}
                    onChange={(e) =>
                      updateUrlParams({ sort: e.target.value as SortOption }, true)
                    }
                    className="h-8 px-2.5 bg-[#1F150F] border border-[#3C281B] rounded text-xs text-[#F5EFEA]"
                  >
                    <option value="recent">Listados recentemente</option>
                    <option value="price_asc">Menor preço (ETH)</option>
                    <option value="price_desc">Maior preço (ETH)</option>
                    <option value="popular">Mais avaliados</option>
                  </select>
                </div>
              </div>
            </div>

            {mobileFiltersOpen && (
              <div className="lg:hidden">
                {filterPanelContent}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {searchQuery && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#261A12] border border-[#CF8A49] text-[#F5EFEA]">
                    <span>Busca: "{searchQuery}"</span>
                    <button
                      type="button"
                      aria-label="Remover filtro de busca"
                      onClick={() => updateUrlParams({ q: undefined }, true)}
                    >
                      <X className="w-3 h-3 text-[#CF8A49]" />
                    </button>
                  </span>
                )}
                {selectedCategories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#261A12] border border-[#3C281B] text-[#D7C7B8]"
                  >
                    <span>{cat}</span>
                    <button
                      type="button"
                      aria-label={`Remover filtro ${cat}`}
                      onClick={() => toggleCategory(cat)}
                    >
                      <X className="w-3 h-3 text-[#CF8A49]" />
                    </button>
                  </span>
                ))}
                {selectedNetworks.map((net) => (
                  <span
                    key={net}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#261A12] border border-[#3C281B] text-[#D7C7B8]"
                  >
                    <span>{net}</span>
                    <button
                      type="button"
                      aria-label={`Remover filtro ${net}`}
                      onClick={() => toggleNetwork(net)}
                    >
                      <X className="w-3 h-3 text-[#CF8A49]" />
                    </button>
                  </span>
                ))}
                {(searchQuery ||
                  selectedCategories.length > 0 ||
                  selectedNetworks.length > 0 ||
                  search.minPrice ||
                  search.maxPrice) && (
                  <button
                    type="button"
                    data-testid="clear-all-filters"
                    onClick={clearAllFilters}
                    className="text-[#CF8A49] hover:underline font-semibold ml-1"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>

              {isFetching && !isLoading && (
                <span
                  role="status"
                  className="text-[11px] text-[#CF8A49] flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3 animate-spin" /> Atualizando catálogo...
                </span>
              )}
            </div>

            {isLoading ? (
              <CatalogGridSkeleton count={9} />
            ) : isError ? (
              <div
                role="alert"
                data-testid="catalog-error-state"
                className="bg-[#1F150F] border border-[#E05844] rounded-lg p-8 text-center flex flex-col items-center gap-3"
              >
                <p className="text-sm font-bold text-[#F5EFEA]">
                  Não foi possível carregar o catálogo de NFTs
                </p>
                <p className="text-xs text-[#A89688] max-w-md">
                  {extractApiError(error).message}
                </p>
                <button
                  type="button"
                  data-testid="catalog-retry-button"
                  onClick={() => refetch()}
                  className="mt-2 inline-flex items-center gap-2 px-5 h-9 bg-[#CF8A49] hover:bg-[#DF9B5A] text-[#130D09] text-xs font-bold rounded"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tentar novamente</span>
                </button>
              </div>
            ) : !data || data.items.length === 0 ? (
              <div
                data-testid="catalog-empty-state"
                className="bg-[#1F150F] border border-[#3C281B] rounded-lg p-10 text-center flex flex-col items-center gap-3"
              >
                <Search className="w-8 h-8 text-[#CF8A49]" />
                <p className="text-sm font-bold text-[#F5EFEA]">
                  Nenhum NFT encontrado para os filtros selecionados
                </p>
                <p className="text-xs text-[#A89688] max-w-md">
                  Experimente ajustar o termo de busca, a faixa de preço ou as coleções selecionadas.
                </p>
                <button
                  type="button"
                  data-testid="empty-reset-filters"
                  onClick={clearAllFilters}
                  className="mt-2 px-5 h-9 bg-[#CF8A49] hover:bg-[#DF9B5A] text-[#130D09] text-xs font-bold rounded"
                >
                  Limpar todos os filtros
                </button>
              </div>
            ) : (
              <>
                <div
                  data-testid="catalog-grid"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {data.items.map((nft) => {
                    const isFav = favoriteIds.includes(nft.id);
                    return (
                      <article
                        key={nft.id}
                        data-testid={`nft-card-${nft.id}`}
                        className="group bg-[#1F150F] border border-[#2C1D13] hover:border-[#CF8A49] rounded-lg p-3.5 transition-all flex flex-col justify-between relative"
                      >
                        {nft.originalPriceEth && (
                          <span className="absolute top-5 left-5 z-10 px-2 py-0.5 rounded-sm bg-[#CF8A49] text-[#130D09] text-[10px] font-extrabold uppercase tracking-wider">
                            RARO
                          </span>
                        )}

                        <div className="relative mb-3">
                          <Link
                            to="/nft/$nftId"
                            params={{ nftId: nft.id }}
                            className="block aspect-square rounded-lg overflow-hidden bg-[#E5DEC9] focus:outline-none"
                          >
                            <img
                              src={nft.image}
                              alt={`${nft.name} — Coleção ${nft.collection}`}
                              width={260}
                              height={260}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </Link>

                          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <button
                              type="button"
                              aria-label={`Adicionar ${nft.name} ao carrinho`}
                              onClick={(e) => {
                                e.preventDefault();
                                addCartItemMutation.mutate({
                                  nftId: nft.id,
                                  edition: '1/50',
                                  quantity: 1,
                                });
                              }}
                              className="w-7 h-7 rounded bg-[#21160F] border border-[#4E3524] hover:border-[#CF8A49] text-[#F5EFEA] hover:text-[#CF8A49] flex items-center justify-center shadow"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              data-testid={`card-favorite-${nft.id}`}
                              aria-label={
                                isFav
                                  ? `Remover ${nft.name} dos favoritos`
                                  : `Favoritar ${nft.name}`
                              }
                              aria-pressed={isFav}
                              onClick={(e) => handleToggleFavorite(e, nft)}
                              className="w-7 h-7 rounded bg-[#21160F] border border-[#4E3524] hover:border-[#CF8A49] text-[#F5EFEA] hover:text-[#CF8A49] flex items-center justify-center shadow"
                            >
                              <Heart
                                className={`w-3.5 h-3.5 ${
                                  isFav ? 'fill-[#CF8A49] text-[#CF8A49]' : ''
                                }`}
                              />
                            </button>

                            <Link
                              to="/nft/$nftId"
                              params={{ nftId: nft.id }}
                              aria-label={`Ver detalhes de ${nft.name}`}
                              className="w-7 h-7 rounded bg-[#21160F] border border-[#4E3524] hover:border-[#CF8A49] text-[#F5EFEA] hover:text-[#CF8A49] flex items-center justify-center shadow"
                            >
                              <Search className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>

                        <Link
                          to="/nft/$nftId"
                          params={{ nftId: nft.id }}
                          className="block focus:outline-none"
                        >
                          <h3 className="text-xs font-bold text-[#F5EFEA] group-hover:text-[#CF8A49] transition-colors truncate">
                            {nft.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-xs">
                            <span
                              data-testid={`nft-price-${nft.id}`}
                              className="font-extrabold text-[#CF8A49]"
                            >
                              {nft.priceEth} ETH
                            </span>
                            {nft.originalPriceEth && (
                              <span className="text-[#7B695B] line-through text-[11px]">
                                {nft.originalPriceEth} ETH
                              </span>
                            )}
                          </div>
                        </Link>
                      </article>
                    );
                  })}
                </div>

                {data.totalPages > 1 && (
                  <nav
                    aria-label="Paginação do catálogo"
                    className="flex items-center justify-end gap-1.5 mt-4"
                  >
                    {currentPage > 1 && (
                      <button
                        type="button"
                        data-testid="pagination-prev"
                        aria-label="Página anterior"
                        onClick={() =>
                          updateUrlParams({ page: currentPage - 1 }, false)
                        }
                        className="w-8 h-8 rounded border border-[#3C281B] bg-[#1F150F] text-[#D7C7B8] hover:border-[#CF8A49] flex items-center justify-center text-xs"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    )}

                    {Array.from({ length: data.totalPages }, (_, i) => i + 1).map(
                      (pageNum) => (
                        <button
                          key={pageNum}
                          type="button"
                          data-testid={`pagination-page-${pageNum}`}
                          aria-label={`Página ${pageNum}`}
                          aria-current={currentPage === pageNum ? 'page' : undefined}
                          onClick={() => updateUrlParams({ page: pageNum }, false)}
                          className={`w-8 h-8 rounded text-xs font-bold transition-colors flex items-center justify-center ${
                            currentPage === pageNum
                              ? 'bg-[#CF8A49] text-[#130D09]'
                              : 'bg-[#1F150F] border border-[#3C281B] text-[#D7C7B8] hover:border-[#CF8A49]'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    )}

                    {currentPage < data.totalPages && (
                      <button
                        type="button"
                        data-testid="pagination-next"
                        aria-label="Próxima página"
                        onClick={() =>
                          updateUrlParams({ page: currentPage + 1 }, false)
                        }
                        className="w-8 h-8 rounded border border-[#3C281B] bg-[#1F150F] text-[#D7C7B8] hover:border-[#CF8A49] flex items-center justify-center text-xs"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </nav>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <section
        aria-label="Coleções em destaque"
        className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14"
      >
        <div className="bg-[#1F150F] border border-[#3C281B] rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-full sm:w-44 aspect-square rounded-lg overflow-hidden bg-[#DBD3BE] shrink-0">
            <img
              src="/assets/nfts/emerald-ape.png"
              alt="Lançamentos gênesis de edição limitada"
              width={176}
              height={176}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col items-start sm:items-end sm:text-right flex-1 gap-2.5">
            <h2 className="text-sm sm:text-base font-extrabold text-[#F5EFEA]">
              Lançamentos gênesis de edição limitada
            </h2>
            <p className="text-xs text-[#A89688] leading-relaxed">
              Colecione edições exclusivas diretamente com criadores antes da revenda pública.
            </p>
            <button
              type="button"
              onClick={() => updateUrlParams({ tab: 'new' }, true)}
              className="mt-1 inline-flex items-center gap-2 px-4 h-9 bg-[#CF8A49] hover:bg-[#DF9B5A] text-[#130D09] text-xs font-bold rounded transition-colors"
            >
              <span>Explorar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="bg-[#1F150F] border border-[#3C281B] rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-full sm:w-44 aspect-square rounded-lg overflow-hidden bg-[#DBD3BE] shrink-0">
            <img
              src="/assets/nfts/ivory-ape.png"
              alt="Arte digital selecionada e muito mais"
              width={176}
              height={176}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col items-start sm:items-end sm:text-right flex-1 gap-2.5">
            <h2 className="text-sm sm:text-base font-extrabold text-[#F5EFEA]">
              Arte digital selecionada e muito mais
            </h2>
            <p className="text-xs text-[#A89688] leading-relaxed">
              Explore novos artistas, coleções verificadas e obras digitais com curadoria.
            </p>
            <button
              type="button"
              onClick={() => updateUrlParams({ tab: 'trending' }, true)}
              className="mt-1 inline-flex items-center gap-2 px-4 h-9 bg-[#CF8A49] hover:bg-[#DF9B5A] text-[#130D09] text-xs font-bold rounded transition-colors"
            >
              <span>Explorar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      <section aria-label="Diário da Cunhagem" className="mb-8">
        <div className="text-center max-w-xl mx-auto mb-8">
          <h2 className="text-lg sm:text-xl font-extrabold text-[#F5EFEA]">
            Diário da Cunhagem
          </h2>
          <p className="text-xs text-[#A89688] mt-1.5">
            Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {BLOG_POSTS.map((post) => (
            <article
              key={post.id}
              className="bg-[#1F150F] border border-[#3C281B] rounded-lg overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="aspect-[4/3] bg-[#DBD3BE] overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    width={280}
                    height={210}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <p className="text-[10px] text-[#CF8A49] mb-1.5">
                    {post.date} &nbsp;|&nbsp; {post.readTime}
                  </p>
                  <h3 className="text-xs font-bold text-[#F5EFEA] mb-1.5 leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-[11px] text-[#A89688] leading-relaxed">
                    {post.excerpt}
                  </p>
                </div>
              </div>
              <div className="px-4 pb-4">
                <button
                  type="button"
                  onClick={() =>
                    toast({
                      title: `Tela ${post.title} fora do escopo do desafio`,
                    })
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#CF8A49] hover:underline"
                >
                  <span>Ler mais</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};
