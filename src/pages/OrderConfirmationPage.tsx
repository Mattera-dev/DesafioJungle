import React, { useEffect } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, ShieldAlert, X } from 'lucide-react';
import { useOrderDetailQuery } from '@/hooks/useQueries';
import { useAuth } from '@/contexts/AuthContext';
import { extractApiError } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

const ThankYouEnvelopeIcon: React.FC = () => (
  <svg
    width="56"
    height="56"
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className="mx-auto mb-3"
  >
    <path
      d="M12 24L32 10L52 24V52C52 54.2091 50.2091 56 48 56H16C13.7909 56 12 54.2091 12 52V24Z"
      stroke="#CF8A49"
      strokeWidth="2"
      fill="#1F150F"
    />
    <rect
      x="18"
      y="14"
      width="28"
      height="26"
      rx="2"
      fill="#1F150F"
      stroke="#CF8A49"
      strokeWidth="2"
    />
    <text
      x="32"
      y="25"
      textAnchor="middle"
      fill="#CF8A49"
      fontSize="6.5"
      fontWeight="800"
      fontFamily="monospace"
    >
      THANK
    </text>
    <text
      x="32"
      y="33"
      textAnchor="middle"
      fill="#CF8A49"
      fontSize="6.5"
      fontWeight="800"
      fontFamily="monospace"
    >
      YOU
    </text>
    <path d="M12 26L32 40L52 26" stroke="#CF8A49" strokeWidth="2" />
    <path d="M12 54L26 38" stroke="#CF8A49" strokeWidth="2" />
    <path d="M52 54L38 38" stroke="#CF8A49" strokeWidth="2" />
  </svg>
);

export const OrderConfirmationPage: React.FC = () => {
  const { orderId } = useParams({ strict: false }) as { orderId: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, openAuthModal } = useAuth();
  const { toast } = useToast();

  const { data, isLoading, isError, error } = useOrderDetailQuery(orderId);
  const order = data?.order;

  useEffect(() => {
    if (order?.status === 'confirmed') {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['quote'] });
      queryClient.invalidateQueries({ queryKey: ['nfts'] });
    }
  }, [order?.status, queryClient]);

  if (!isAuthenticated) {
    return (
      <main className="max-w-[1280px] mx-auto px-4 sm:px-8 py-14">
        <div className="max-w-md mx-auto bg-[#1F150F] border border-[#3C281B] rounded-xl p-8 text-center flex flex-col items-center gap-4">
          <h1 className="text-base font-extrabold text-[#F5EFEA]">
            Autenticação necessária
          </h1>
          <p className="text-xs text-[#A89688]">
            Faça login para visualizar os detalhes e o recibo deste pedido.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal('login', `/orders/${orderId}`)}
            className="px-6 h-10 bg-[#CF8A49] text-[#130D09] text-xs font-extrabold rounded"
          >
            Entrar
          </button>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="max-w-[1280px] mx-auto px-4 sm:px-8 py-14 flex justify-center">
        <div className="w-full max-w-lg bg-[#1F150F] border border-[#3C281B] rounded-xl p-10 text-center flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#CF8A49] animate-spin" />
          <p className="text-xs text-[#D7C7B8]">Carregando dados do pedido...</p>
        </div>
      </main>
    );
  }

  if (isError || !order) {
    const apiErr = extractApiError(error);
    return (
      <main className="max-w-[1280px] mx-auto px-4 sm:px-8 py-14 flex justify-center">
        <div
          role="alert"
          data-testid="order-error-state"
          className="w-full max-w-lg bg-[#1F150F] border border-[#E05844] rounded-xl p-8 text-center flex flex-col items-center gap-3"
        >
          <ShieldAlert className="w-9 h-9 text-[#E05844]" />
          <h1 className="text-base font-extrabold text-[#F5EFEA]">
            Não foi possível acessar o pedido
          </h1>
          <p className="text-xs text-[#A89688]">{apiErr.message}</p>
          <Link
            to="/"
            className="mt-2 px-5 h-9 bg-[#CF8A49] text-[#130D09] text-xs font-extrabold rounded inline-flex items-center"
          >
            Voltar ao início
          </Link>
        </div>
      </main>
    );
  }

  if (order.status === 'pending') {
    return (
      <main className="max-w-[1280px] mx-auto px-4 sm:px-8 py-14 flex justify-center">
        <div
          role="status"
          data-testid="order-pending-view"
          className="w-full max-w-lg bg-[#1F150F] border border-[#CF8A49] rounded-xl p-8 text-center flex flex-col items-center gap-4"
        >
          <Loader2 className="w-10 h-10 text-[#CF8A49] animate-spin" />
          <h1 className="text-base font-extrabold text-[#F5EFEA]">
            Processando pedido na blockchain...
          </h1>
          <p className="text-xs text-[#A89688]">
            Aguardando confirmação da transação {order.transactionHash.slice(0, 14)}... O recibo será exibido assim que a simulação confirmar o bloco.
          </p>
        </div>
      </main>
    );
  }

  if (order.status === 'rejected') {
    return (
      <main className="max-w-[1280px] mx-auto px-4 sm:px-8 py-14 flex justify-center">
        <div
          role="alert"
          data-testid="order-rejected-view"
          className="w-full max-w-lg bg-[#1F150F] border border-[#E05844] rounded-xl p-8 text-center flex flex-col items-center gap-4"
        >
          <ShieldAlert className="w-10 h-10 text-[#E05844]" />
          <h1 className="text-base font-extrabold text-[#F5EFEA]">
            Pedido Recusado (#{order.id})
          </h1>
          <p className="text-xs text-[#A89688]">
            {order.failureReason ||
              'A transação não pôde ser confirmada. Os itens permanecem no seu carrinho.'}
          </p>
          <Link
            to="/checkout"
            className="mt-2 px-6 h-10 bg-[#CF8A49] text-[#130D09] text-xs font-extrabold rounded inline-flex items-center"
          >
            Voltar para o pagamento
          </Link>
        </div>
      </main>
    );
  }

  const formattedDate = new Date(order.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const shortTx = `${order.transactionHash.slice(0, 6)}..${order.transactionHash
    .slice(-4)
    .toUpperCase()}`;

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-8 py-12 flex justify-center">
      <section
        aria-label="Confirmação de pedido"
        data-testid="order-confirmation-receipt"
        className="relative w-full max-w-[460px] bg-[#21160F] border border-[#3C281B] border-b-[6px] border-b-[#CF8A49] rounded-sm p-6 sm:p-8 shadow-2xl text-xs"
      >
        <button
          type="button"
          aria-label="Voltar ao catálogo"
          onClick={() => navigate({ to: '/' })}
          className="absolute top-3.5 right-3.5 text-[#CF8A49] hover:text-[#F5EFEA] p-1"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center pb-5">
          <ThankYouEnvelopeIcon />
          <h1 className="text-xs sm:text-sm font-bold text-[#D7C7B8]">
            Seus NFTs agora estão na sua carteira
          </h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3.5 px-2 border-y border-[#4E3524] text-[10px]">
          <div className="sm:border-r sm:border-[#4E3524] sm:pr-2">
            <span className="text-[#CF8A49] font-bold block">ID da transação</span>
            <span data-testid="receipt-tx-hash" className="text-[#D7C7B8] mt-0.5 block">
              {shortTx}
            </span>
          </div>
          <div className="sm:border-r sm:border-[#4E3524] sm:pr-2">
            <span className="text-[#A89688] block">Data</span>
            <span className="text-[#D7C7B8] mt-0.5 block">{formattedDate}</span>
          </div>
          <div className="sm:border-r sm:border-[#4E3524] sm:pr-2">
            <span className="text-[#A89688] block">Total</span>
            <span className="text-[#D7C7B8] mt-0.5 block">{order.totalEth} ETH</span>
          </div>
          <div>
            <span className="text-[#F5EFEA] font-bold block">Carteira</span>
            <span className="text-[#D7C7B8] mt-0.5 block">{order.walletType}</span>
          </div>
        </div>

        <div className="pt-5 pb-4 border-b border-[#4E3524]">
          <h2 className="text-xs font-extrabold text-[#F5EFEA] mb-2">
            Detalhes da transação
          </h2>

          <div className="grid grid-cols-12 text-[11px] font-bold text-[#F5EFEA] pb-2 border-b border-[#3C281B]">
            <div className="col-span-7">NFTs</div>
            <div className="col-span-2 text-center">Edições</div>
            <div className="col-span-3 text-right">Subtotal</div>
          </div>

          <div className="flex flex-col gap-3 mt-3">
            {order.items.map((item, idx) => (
              <div
                key={`${item.nftId}-${idx}`}
                data-testid={`receipt-item-${item.nftId}`}
                className="grid grid-cols-12 items-center gap-2 bg-[#281B12] rounded p-2"
              >
                <div className="col-span-7 flex items-center gap-2.5 min-w-0">
                  <div className="w-11 h-11 rounded bg-[#E5DEC9] overflow-hidden shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      width={44}
                      height={44}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-[#F5EFEA] text-[11px] truncate">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-[#A89688]">
                      ID do token: {item.tokenId}
                    </p>
                  </div>
                </div>

                <div className="col-span-2 text-center text-[11px] text-[#A89688]">
                  (x {item.quantity})
                </div>

                <div
                  data-testid={`receipt-item-total-${item.nftId}`}
                  className="col-span-3 text-right font-extrabold text-[#CF8A49] text-[11px]"
                >
                  {item.lineTotalEth} ETH
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-1.5 text-xs">
            {order.discountEth !== '0.00' && (
              <div className="grid grid-cols-12 items-center">
                <span className="col-span-7 text-right text-[#D7C7B8] pr-4">
                  Desconto ({order.couponCode})
                </span>
                <span
                  data-testid="receipt-discount"
                  className="col-span-5 text-right text-[#D7C7B8]"
                >
                  (-) {order.discountEth} ETH
                </span>
              </div>
            )}
            <div className="grid grid-cols-12 items-center">
              <span className="col-span-7 text-right text-[#D7C7B8] pr-4">
                Taxa de rede
              </span>
              <span
                data-testid="receipt-network-fee"
                className="col-span-5 text-right text-[#F5EFEA]"
              >
                {order.networkFeeEth} ETH
              </span>
            </div>
            <div className="grid grid-cols-12 items-center pt-1 font-extrabold">
              <span className="col-span-7 text-right text-[#F5EFEA] pr-4">
                Total
              </span>
              <span
                data-testid="receipt-total"
                className="col-span-5 text-right text-[#CF8A49]"
              >
                {order.totalEth} ETH
              </span>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-[#A89688] mt-4 mb-5 leading-relaxed">
          Transação confirmada na {order.network}. A propriedade foi transferida para sua carteira conectada e registrada na rede.
        </p>

        <div className="flex justify-center">
          <button
            type="button"
            data-testid="receipt-continue-button"
            onClick={() => {
              toast({
                title: 'Explorador de Blocos Simulado',
                description: `Transação verificada na ${order.network}: ${order.transactionHash}`,
                variant: 'success',
              });
            }}
            className="px-6 h-9 bg-[#CF8A49] hover:bg-[#DF9B5A] text-[#130D09] text-xs font-extrabold rounded transition-colors"
          >
            Ver no Etherscan
          </button>
        </div>
      </section>
    </main>
  );
};
