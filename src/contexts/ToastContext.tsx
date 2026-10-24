import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { subscribeRealtimeNotifications } from '@/services/realtime';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'realtime';
}

interface ToastContextValue {
  toasts: ToastItem[];
  toast: (item: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (item: Omit<ToastItem, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-4), { ...item, id }]);
      setTimeout(() => {
        dismissToast(id);
      }, 5000);
    },
    [dismissToast]
  );

  useEffect(() => {
    return subscribeRealtimeNotifications((notif) => {
      toast({
        title:
          notif.type === 'nft.updated'
            ? 'Catálogo / Carrinho Atualizado'
            : 'Status do Pedido Atualizado',
        description: notif.message,
        variant: 'realtime',
      });
    });
  }, [toast]);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismissToast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.variant === 'error' ? 'alert' : 'status'}
            data-testid="toast-notification"
            className={`pointer-events-auto flex items-start gap-3 rounded border p-3.5 shadow-xl transition-all ${
              t.variant === 'error'
                ? 'bg-[#291210] border-[#E05844] text-[#F5EFEA]'
                : t.variant === 'success'
                ? 'bg-[#13241B] border-[#4CAF7A] text-[#F5EFEA]'
                : t.variant === 'realtime'
                ? 'bg-[#261A12] border-[#CF8A49] text-[#F5EFEA]'
                : 'bg-[#1F150F] border-[#3C281B] text-[#F5EFEA]'
            }`}
          >
            {t.variant === 'error' ? (
              <AlertCircle className="w-5 h-5 text-[#E05844] shrink-0 mt-0.5" />
            ) : t.variant === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-[#4CAF7A] shrink-0 mt-0.5" />
            ) : (
              <Info className="w-5 h-5 text-[#CF8A49] shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs leading-relaxed">
              <p className="font-bold">{t.title}</p>
              {t.description && (
                <p className="text-[#A89688] mt-0.5">{t.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              aria-label="Fechar notificação"
              className="text-[#A89688] hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

