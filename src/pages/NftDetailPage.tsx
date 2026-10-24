import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import * as Dialog from '@radix-ui/react-dialog';
import {
  AlertCircle,
  ChevronLeft,
  Heart,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Star,
  X,
} from 'lucide-react';
import { NFTEditionType } from '@/types/contracts';
import {
  useAddCartItemMutation,
  useFavoritesQuery,
  useNftDetailQuery,
  useToggleFavoriteMutation,
} from '@/hooks/useQueries';
import { NftDetailSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export const NftDetailPage: React.FC = () => {
  const { nftId } = useParams({ strict: false }) as { nftId: string };
  const navigate = useNavigate();
  const { isAuthenticated, openAuthModal } = useAuth();
  const { toast } = useToast();

  const { data, isLoading, isError } = useNftDetailQuery(nftId);
  const { data: favoritesData } = useFavoritesQuery();
  const toggleFavoriteMutation = useToggleFavoriteMutation();
  const addCartItemMutation = useAddCartItemMutation();

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedEdition, setSelectedEdition] = useState<NFTEditionType>('1/50');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details');
  const [zoomOpen, setZoomOpen] = useState(false);

  const nft = data?.nft;
  const related = data?.related ?? [];
  const isFavorite = nft ? (favoritesData?.ids ?? []).includes(nft.id) : false;

  useEffect(() => {
    setSelectedImageIdx(0);
    setSelectedEdition('1/50');
    setQuantity(1);
  }, [nftId]);

  const currentEditionObj =
    nft?.editions.find((e) => e.type === selectedEdition) || nft?.editions[0];
  const maxAvailable = currentEditionObj?.available ?? 0;

  useEffect(() => {
    if (maxAvailable > 0 && quantity > maxAvailable) {
      setQuantity(maxAvailable);
    }
  }, [maxAvailable, quantity]);

  if (isLoading) {
    return (
      <main className="max-w-[1280px] mx-auto px-4 sm:px-8 pt-6">
        <NftDetailSkeleton />
      </main>
    );
  }

  if (isError || !nft) {
    return (
      <main className="max-w-[1280px] mx-auto px-4 sm:px-8 pt-10 pb-16">
        <div
          role="alert"
          data-testid="nft-not-found"
          className="bg-[#1F150F] border border-[#3C281B] rounded-xl p-10 text-center max-w-lg mx-auto flex flex-col items-center gap-4"
        >
          <AlertCircle className="w-10 h-10 text-[#CF8A49]" />
          <h1 className="text-lg font-extrabold text-[#F5EFEA]">
            NFT não encontrado
          </h1>
          <p className="text-xs text-[#A89688] leading-relaxed">
            O ativo digital solicitado não existe ou não está mais disponível no catálogo da Kurio.
          </p>
          <Link
            to="/"
            data-testid="back-to-catalog-link"
            className="mt-2 inline-flex items-center justify-center px-6 h-10 bg-[#CF8A49] hover:bg-[#DF9B5A] text-[#130D09] text-xs font-extrabold rounded"
          >
            Voltar ao catálogo
          </Link>
        </div>
      </main>
    );
  }

  const gallery = nft.gallery?.length ? nft.gallery : [nft.image];
  const mainImage = gallery[selectedImageIdx] || nft.image;

  const handleBuy = () => {
    if (!currentEditionObj || currentEditionObj.available <= 0) {
      toast({
        title: 'Edição indisponível',
        description: `A edição ${selectedEdition} está esgotada.`,
        variant: 'error',
      });
      return;
    }
    addCartItemMutation.mutate({
      nftId: nft.id,
      edition: selectedEdition,
      quantity,
    });
  };

  const handleFavoriteClick = () => {
    if (!isAuthenticated) {
      openAuthModal('login', window.location.pathname + window.location.search);
      return;
    }
    toggleFavoriteMutation.mutate({ nft, isFavorite });
  };

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-8 pt-4 sm:pt-6">
      <div className="flex sm:hidden items-center justify-between mb-4">
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => navigate({ to: '/' })}
          className="w-10 h-10 rounded-full bg-[#21160F] border border-[#3C281B] text-[#CF8A49] flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          type="button"
          aria-label={isFavorite ? 'Remover dos favoritos' : 'Favoritar NFT'}
          aria-pressed={isFavorite}
          onClick={handleFavoriteClick}
          className="w-10 h-10 rounded-full bg-[#21160F] border border-[#3C281B] text-[#CF8A49] flex items-center justify-center"
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-[#CF8A49]' : ''}`} />
        </button>
      </div>

      <nav aria-label="Breadcrumb" className="hidden sm:block text-xs text-[#D7C7B8] mb-5">
        <Link to="/" className="hover:text-[#CF8A49]">
          Início
        </Link>
        <span className="mx-2 text-[#7B695B]">/</span>
        <Link to="/" hash="catalogo" className="text-[#F5EFEA] font-semibold">
          Mercado
        </Link>
      </nav>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 mb-14 items-start">
        <div className="lg:col-span-6 flex flex-col-reverse sm:flex-row gap-4">
          <div className="hidden sm:flex sm:flex-col gap-3 shrink-0">
            {gallery.map((imgUrl, idx) => (
              <button
                key={idx}
                type="button"
                data-testid={`gallery-thumb-${idx}`}
                aria-label={`Ver imagem ${idx + 1} de ${nft.name}`}
                onClick={() => setSelectedImageIdx(idx)}
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 bg-[#E5DEC9] transition-all ${
                  selectedImageIdx === idx
                    ? 'border-[#CF8A49]'
                    : 'border-[#3C281B] opacity-75 hover:opacity-100'
                }`}
              >
                <img
                  src={imgUrl}
                  alt={`${nft.name} miniatura ${idx + 1}`}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>

          <div className="relative flex-1 aspect-square rounded-2xl sm:rounded-xl overflow-hidden bg-[#DBD3BE] border border-[#3C281B]">
            <img
              src={mainImage}
              alt={nft.name}
              width={460}
              height={460}
              fetchPriority="high"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => setZoomOpen(true)}
              aria-label="Ampliar imagem do NFT"
              className="hidden sm:flex absolute top-3 right-3 w-8 h-8 rounded-full bg-[#130D09]/80 text-[#F5EFEA] hover:text-[#CF8A49] items-center justify-center border border-[#3C281B]"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="lg:col-span-6 flex flex-col gap-4 bg-[#1F150F] sm:bg-transparent border border-[#3C281B] sm:border-0 rounded-3xl sm:rounded-none p-5 sm:p-0 -mt-6 sm:mt-0 relative z-10">
          <div className="flex items-center justify-between gap-3">
            <h1
              data-testid="nft-detail-title"
              className="text-lg sm:text-2xl font-extrabold text-[#F5EFEA]"
            >
              {nft.name}
            </h1>

            <div className="inline-flex sm:hidden items-center gap-1 px-2.5 py-1 rounded-full border border-[#CF8A49] bg-[#18100B] text-[11px]">
              <Star className="w-3 h-3 fill-[#CF8A49] text-[#CF8A49]" />
              <span className="font-bold text-[#F5EFEA]">4.8</span>
              <span className="text-[#A89688]">({nft.reviewCount})</span>
            </div>
          </div>

          <div className="hidden sm:flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#3C281B]">
            <span
              data-testid="nft-detail-price"
              className="text-base sm:text-lg font-extrabold text-[#CF8A49]"
            >
              {currentEditionObj?.priceEth ?? nft.priceEth} ETH
            </span>

            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-0.5 text-[#CF8A49]" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < nft.rating ? 'fill-[#CF8A49]' : 'text-[#523827]'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[#D7C7B8]">
                {nft.reviewCount} avaliações de colecionadores
              </span>
            </div>
          </div>

          <div>
            <h2 className="hidden sm:block text-xs font-bold text-[#F5EFEA] mb-1.5">
              Sobre este NFT:
            </h2>
            <p className="text-xs text-[#A89688] leading-relaxed">
              {nft.shortDescription}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#F5EFEA]">Edição:</span>
              <span
                data-testid="edition-availability"
                className="text-[11px] text-[#A89688]"
              >
                {maxAvailable > 0
                  ? `${maxAvailable} disponível(is) de ${currentEditionObj?.total}`
                  : 'Edição esgotada'}
              </span>
            </div>

            <div
              role="radiogroup"
              aria-label="Selecionar edição do NFT"
              className="flex flex-wrap items-center gap-2.5"
            >
              {nft.editions.map((ed) => {
                const isSelected = selectedEdition === ed.type;
                const isOut = ed.available <= 0;
                return (
                  <button
                    key={ed.type}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    data-testid={`edition-option-${ed.type}`}
                    onClick={() => {
                      setSelectedEdition(ed.type);
                      setQuantity(1);
                    }}
                    className={`px-3.5 h-8 rounded-full text-xs font-bold border transition-colors ${
                      isSelected
                        ? 'border-[#CF8A49] text-[#CF8A49] bg-[#261A12]'
                        : isOut
                        ? 'border-[#3C281B] text-[#7B695B] line-through opacity-60'
                        : 'border-[#3C281B] text-[#D7C7B8] hover:border-[#CF8A49]'
                    }`}
                  >
                    {ed.type}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-1.5 text-xs text-[#A89688] sm:order-last">
            <p>
              ID do token: <span className="text-[#D7C7B8]">{nft.tokenId}</span>
            </p>
            <p>
              Coleção: <span className="text-[#D7C7B8]">{nft.collection}</span>
            </p>
            <p>
              Atributos:{' '}
              <span className="text-[#D7C7B8]">{nft.attributes.join(', ')}</span>
            </p>
            <div className="hidden sm:flex items-center gap-2.5 pt-1 text-[#F5EFEA] font-bold">
              <span>Compartilhar este NFT:</span>
              {(['LinkedIn', 'Instagram', 'Twitter'] as const).map((net) => (
                <button
                  key={net}
                  type="button"
                  aria-label={`Compartilhar no ${net}`}
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    toast({
                      title: 'Link copiado',
                      description: `Link de ${nft.name} copiado para compartilhamento.`,
                    });
                  }}
                  className="text-[#D7C7B8] hover:text-[#CF8A49] text-xs"
                >
                  {net === 'LinkedIn' ? 'in' : net === 'Instagram' ? 'ig' : '𝕏'}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 sm:mt-0 pt-4 sm:pt-2 border-t border-[#3C281B] sm:border-0 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4">
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <div className="inline-flex items-center gap-3">
                <span className="sm:hidden text-xs text-[#A89688]">Qtd.</span>
                <button
                  type="button"
                  data-testid="detail-qty-decrease"
                  aria-label="Diminuir quantidade"
                  disabled={quantity <= 1 || maxAvailable <= 0}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-7 h-9 sm:w-8 sm:h-8 rounded-full sm:rounded-md bg-[#CF8A49] hover:bg-[#DF9B5A] disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-[#CF8A49] text-[#130D09] font-extrabold flex items-center justify-center transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span
                  data-testid="detail-qty-value"
                  aria-live="polite"
                  className="w-6 text-center text-xs font-bold text-[#F5EFEA]"
                >
                  {maxAvailable > 0 ? quantity : 0}
                </span>
                <button
                  type="button"
                  data-testid="detail-qty-increase"
                  aria-label="Aumentar quantidade"
                  disabled={quantity >= maxAvailable || maxAvailable <= 0}
                  onClick={() =>
                    setQuantity((q) => Math.min(maxAvailable, q + 1))
                  }
                  className="w-7 h-9 sm:w-8 sm:h-8 rounded-full sm:rounded-md bg-[#CF8A49] hover:bg-[#DF9B5A] disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-[#CF8A49] text-[#130D09] font-extrabold flex items-center justify-center transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <span className="sm:hidden text-base font-extrabold text-[#CF8A49]">
                {currentEditionObj?.priceEth ?? nft.priceEth} ETH
              </span>
            </div>

            <div className="flex items-center gap-3 sm:ml-4">
              <button
                type="button"
                data-testid="detail-buy-button"
                disabled={maxAvailable <= 0 || addCartItemMutation.isPending}
                onClick={handleBuy}
                className="flex-1 sm:flex-initial px-7 h-11 sm:h-10 bg-[#CF8A49] hover:bg-[#DF9B5A] disabled:opacity-40 text-[#130D09] text-xs font-extrabold rounded-full sm:rounded uppercase tracking-wider transition-colors"
              >
                {maxAvailable <= 0 ? 'ESGOTADO' : 'COMPRAR'}
              </button>

              <Link
                to="/cart"
                aria-label="Ir para o carrinho"
                className="sm:hidden w-11 h-11 rounded-full bg-[#281B12] border border-[#3C281B] text-[#CF8A49] flex items-center justify-center shrink-0"
              >
                <ShoppingCart className="w-4 h-4" />
              </Link>

              <button
                type="button"
                data-testid="detail-favorite-button"
                aria-pressed={isFavorite}
                onClick={handleFavoriteClick}
                className={`inline-flex items-center gap-2 px-4 h-11 sm:h-10 rounded-full sm:rounded border text-xs font-bold transition-colors ${
                  isFavorite
                    ? 'border-[#CF8A49] bg-[#261A12] text-[#CF8A49]'
                    : 'border-[#523827] bg-transparent text-[#CF8A49] hover:border-[#CF8A49]'
                }`}
              >
                <Heart
                  className={`w-3.5 h-3.5 ${isFavorite ? 'fill-[#CF8A49]' : ''}`}
                />
                <span className="hidden sm:inline">
                  {isFavorite ? 'Favoritado' : 'Favoritar'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-14">
        <div
          role="tablist"
          aria-label="Informações adicionais do NFT"
          className="flex items-center gap-8 border-b border-[#3C281B] text-xs mb-6"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'details'}
            onClick={() => setActiveTab('details')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-[#CF8A49] text-[#CF8A49] font-bold'
                : 'border-transparent text-[#D7C7B8] hover:text-[#CF8A49]'
            }`}
          >
            Detalhes do NFT
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'reviews'}
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'reviews'
                ? 'border-[#CF8A49] text-[#CF8A49] font-bold'
                : 'border-transparent text-[#D7C7B8] hover:text-[#CF8A49]'
            }`}
          >
            Avaliações de colecionadores ({nft.reviewCount})
          </button>
        </div>

        {activeTab === 'details' ? (
          <div className="flex flex-col gap-4 text-xs text-[#A89688] leading-relaxed">
            {nft.fullDescription.map((para, i) => (
              <p key={i}>{para}</p>
            ))}

            <div className="mt-2">
              <h3 className="font-bold text-[#F5EFEA] mb-0.5">Rede:</h3>
              <p>{nft.networkDetails}</p>
            </div>

            <div>
              <h3 className="font-bold text-[#F5EFEA] mb-0.5">Contrato:</h3>
              <p>{nft.contractDetails}</p>
            </div>

            <div>
              <h3 className="font-bold text-[#F5EFEA] mb-0.5">Direitos autorais:</h3>
              <p>{nft.copyrightDetails}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {nft.reviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-[#1F150F] border border-[#3C281B] rounded-lg p-4 flex flex-col gap-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#F5EFEA]">{rev.author}</span>
                  <span className="text-[10px] text-[#7B695B]">{rev.date}</span>
                </div>
                <div className="flex items-center gap-0.5 text-[#CF8A49]">
                  {Array.from({ length: rev.rating }).map((_, idx) => (
                    <Star key={idx} className="w-3 h-3 fill-[#CF8A49]" />
                  ))}
                </div>
                <p className="text-[#A89688] leading-relaxed">{rev.comment}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-label="Mais desta coleção" className="mb-10">
        <div className="border-b border-[#3C281B] pb-2.5 mb-6">
          <h2 className="text-xs font-bold text-[#CF8A49]">Mais desta coleção</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
          {related.map((item) => (
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

      <Dialog.Root open={zoomOpen} onOpenChange={setZoomOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <Dialog.Title className="sr-only">
              Visualização ampliada de {nft.name}
            </Dialog.Title>
            <div className="relative max-w-lg w-full bg-[#1F150F] border border-[#3C281B] rounded-xl p-4">
              <button
                type="button"
                aria-label="Fechar visualização ampliada"
                onClick={() => setZoomOpen(false)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#130D09] text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
              <img
                src={mainImage}
                alt={nft.name}
                className="w-full aspect-square object-cover rounded-lg"
              />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
};
