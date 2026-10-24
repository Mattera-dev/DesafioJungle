import React from 'react';
import { cn } from '@/lib/eth';

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return (
    <div
      data-testid="skeleton-shimmer"
      aria-hidden="true"
      className={cn('skeleton-shimmer rounded bg-[#241811]', className)}
      {...props}
    />
  );
};

export const CatalogGridSkeleton: React.FC<{ count?: number }> = ({ count = 9 }) => {
  return (
    <div
      data-testid="catalog-skeleton"
      aria-busy="true"
      aria-label="Carregando catálogo de NFTs"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-[#1F150F] border border-[#3C281B] rounded-lg p-3.5 flex flex-col gap-3"
        >
          <Skeleton className="w-full aspect-square rounded-lg" />
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-4 w-1/3 rounded" />
        </div>
      ))}
    </div>
  );
};

export const NftDetailSkeleton: React.FC = () => {
  return (
    <div
      data-testid="nft-detail-skeleton"
      aria-busy="true"
      aria-label="Carregando detalhes do NFT"
      className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-6"
    >
      <div className="lg:col-span-6 flex gap-4">
        <div className="hidden sm:flex flex-col gap-3 w-20">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-20 h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="flex-1 aspect-square rounded-xl" />
      </div>
      <div className="lg:col-span-6 flex flex-col gap-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-2/3" />
      </div>
    </div>
  );
};

export const CartSummarySkeleton: React.FC = () => {
  return (
    <div
      data-testid="cart-summary-skeleton"
      aria-busy="true"
      aria-label="Carregando resumo do carrinho"
      className="bg-[#1F150F] border border-[#3C281B] rounded-lg p-5 flex flex-col gap-4"
    >
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
};

