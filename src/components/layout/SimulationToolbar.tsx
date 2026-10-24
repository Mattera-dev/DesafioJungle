import React, { useEffect, useState } from 'react';
import { MockScenario } from '@/types/contracts';
import { getMockScenario, resetMockDb, setMockScenario } from '@/mocks/db';
import { simulateNftMutationAndEmit } from '@/mocks/socket';
import { api } from '@/services/api';
import { queryClient } from '@/services/queryClient';
import { disconnectRealtimeSocket, reconnectRealtimeSocket } from '@/services/realtime';
import { Settings2, RotateCcw, Zap, WifiOff } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

const SCENARIOS: { value: MockScenario; label: string }[] = [
  { value: 'default', label: 'Padrão (Sucesso)' },
  { value: 'empty', label: 'Catálogo Vazio' },
  { value: 'slow', label: 'Latência Lenta (Skeletons)' },
  { value: 'out-of-order', label: 'Respostas Fora de Ordem' },
  { value: 'network-error', label: 'Falha de Conexão' },
  { value: 'http-500', label: 'Erro HTTP 500' },
  { value: 'session-expired', label: 'Sessão Expirada (401)' },
  { value: 'conflict-register', label: 'Conflito de Cadastro (409)' },
  { value: 'coupon-invalid', label: 'Cupom Inválido' },
  { value: 'coupon-expired', label: 'Cupom Expirado' },
  { value: 'price-changed', label: 'Mudança de Preço no Checkout' },
  { value: 'edition-exhausted', label: 'Edição Esgotada no Checkout' },
  { value: 'order-timeout', label: 'Timeout Pós-Criação (Idempotência)' },
  { value: 'payment-rejected', label: 'Pagamento Recusado' },
  { value: 'payment-confirmed', label: 'Pagamento Confirmado' },
];

export const SimulationToolbar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [scenario, setScenarioState] = useState<MockScenario>(() => getMockScenario());
  const { toast } = useToast();

  useEffect(() => {
    const onScenarioChange = (e: Event) => {
      const custom = e as CustomEvent<MockScenario>;
      setScenarioState(custom.detail);
    };
    window.addEventListener('kurio:scenario-changed', onScenarioChange);
    return () => window.removeEventListener('kurio:scenario-changed', onScenarioChange);
  }, []);

  const handleSelectScenario = (next: MockScenario) => {
    setMockScenario(next);
    setScenarioState(next);
    toast({
      title: 'Cenário MSW alterado',
      description: `Cenário ativo: ${next}`,
    });
  };

  const handleReset = () => {
    resetMockDb();
    queryClient.invalidateQueries();
    toast({
      title: 'Mocks restaurados',
      description: 'O estado de catálogo, carrinho, favoritos e pedidos foi restaurado.',
      variant: 'success',
    });
  };

  const handleTriggerSocketPriceChange = () => {
    if (window.__KURIO_MOCK__) {
      window.__KURIO_MOCK__.emitNftUpdate({
        nftId: 'emerald-ape-042',
        newPriceEth: '1.49',
      });
    } else {
      simulateNftMutationAndEmit({
        nftId: 'emerald-ape-042',
        newPriceEth: '1.49',
      });
    }
  };

  return (
    <div className="fixed bottom-3 left-3 z-40">
      {open ? (
        <div
          role="region"
          aria-label="Painel de controle de simulação MSW e Socket.IO"
          className="w-80 bg-[#1F150F] border border-[#CF8A49] rounded-lg p-4 shadow-2xl text-xs text-[#F5EFEA]"
        >
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#3C281B]">
            <span className="font-bold text-[#CF8A49] flex items-center gap-1.5">
              <Settings2 className="w-4 h-4" /> Simulador MSW & Socket.IO
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[#A89688] hover:text-white font-bold px-1"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label htmlFor="sim-scenario-select" className="block text-[11px] text-[#A89688] mb-1">
                Cenário de Rede / API:
              </label>
              <select
                id="sim-scenario-select"
                data-testid="sim-scenario-select"
                value={scenario}
                onChange={(e) => handleSelectScenario(e.target.value as MockScenario)}
                className="w-full h-8 px-2 bg-[#130D09] border border-[#3C281B] rounded text-xs text-[#F5EFEA]"
              >
                {SCENARIOS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="sim-trigger-nft-update"
                onClick={handleTriggerSocketPriceChange}
                className="flex items-center justify-center gap-1 h-8 px-2 rounded bg-[#261A12] border border-[#3C281B] hover:border-[#CF8A49] text-[11px]"
              >
                <Zap className="w-3.5 h-3.5 text-[#CF8A49]" />
                <span>Socket: Preço NFT</span>
              </button>

              <button
                type="button"
                data-testid="sim-expire-session"
                onClick={async () => {
                  await api.expireSession();
                  toast({
                    title: 'Sessão marcada como expirada',
                    description: 'A próxima requisição privada acionará a retomada de sessão.',
                  });
                }}
                className="flex items-center justify-center gap-1 h-8 px-2 rounded bg-[#261A12] border border-[#3C281B] hover:border-[#CF8A49] text-[11px]"
              >
                <span>Expirar Sessão</span>
              </button>

              <button
                type="button"
                data-testid="sim-socket-reconnect"
                onClick={() => {
                  disconnectRealtimeSocket();
                  setTimeout(() => reconnectRealtimeSocket(), 300);
                  toast({
                    title: 'Socket reconectado',
                    description: 'Recursos ativos reconciliados com a API REST.',
                  });
                }}
                className="flex items-center justify-center gap-1 h-8 px-2 rounded bg-[#261A12] border border-[#3C281B] hover:border-[#CF8A49] text-[11px]"
              >
                <WifiOff className="w-3.5 h-3.5 text-[#CF8A49]" />
                <span>Reconectar Socket</span>
              </button>

              <button
                type="button"
                data-testid="sim-reset-db"
                onClick={handleReset}
                className="flex items-center justify-center gap-1 h-8 px-2 rounded bg-[#CF8A49] text-[#130D09] font-bold text-[11px]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resetar Dados</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          data-testid="sim-toolbar-toggle"
          aria-label="Abrir simulador de cenários MSW e Socket.IO"
          onClick={() => setOpen(true)}
          className="h-8 px-3 rounded-full bg-[#1F150F]/90 border border-[#3C281B] hover:border-[#CF8A49] text-[11px] text-[#CF8A49] font-bold flex items-center gap-1.5 shadow-lg"
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>MSW: {scenario}</span>
        </button>
      )}
    </div>
  );
};

