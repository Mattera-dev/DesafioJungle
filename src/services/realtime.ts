import { io, Socket } from 'socket.io-client';
import {
  NFT,
  NFTListResponse,
  NFTUpdatedEventPayload,
  Order,
  OrderUpdatedEventPayload,
} from '@/types/contracts';
import { queryClient } from './queryClient';
import { getStoredSession } from './authStore';

let socketInstance: Socket | null = null;
const processedEventIds = new Set<string>();
const resourceVersions = new Map<string, number>();

export type RealtimeNotification = {
  id: string;
  type: 'nft.updated' | 'order.updated' | 'socket.reconnected';
  message: string;
  timestamp: string;
};

type NotificationListener = (notification: RealtimeNotification) => void;
const notificationListeners = new Set<NotificationListener>();

export function subscribeRealtimeNotifications(
  listener: NotificationListener
): () => void {
  notificationListeners.add(listener);
  return () => {
    notificationListeners.delete(listener);
  };
}

function notifyListeners(notification: RealtimeNotification) {
  for (const listener of notificationListeners) {
    listener(notification);
  }
}

export function resetRealtimeStateForSessionChange(newToken: string | null): void {
  processedEventIds.clear();
  resourceVersions.clear();
  if (socketInstance) {
    if (newToken) {
      socketInstance.emit('auth:bind', { token: newToken });
    } else {
      socketInstance.emit('auth:unbind');
    }
  }
}

export function dispatchNftUpdatedEvent(payload: NFTUpdatedEventPayload): void {
  if (socketInstance) {
    socketInstance.listeners('nft.updated').forEach((listener) => {
      listener(payload);
    });
  }
}

export function dispatchOrderUpdatedEvent(payload: OrderUpdatedEventPayload): void {
  if (socketInstance) {
    socketInstance.listeners('order.updated').forEach((listener) => {
      listener(payload);
    });
  }
}

export function initRealtimeSocket(): Socket {
  if (socketInstance) return socketInstance;

  const session = getStoredSession();
  const socket = io(window.location.origin, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionAttempts: Infinity,
    query: {
      token: session?.token || '',
    },
  });

  socketInstance = socket;

  socket.on('connect', () => {
    const currentSession = getStoredSession();
    if (currentSession?.token) {
      socket.emit('auth:bind', { token: currentSession.token });
    }

    queryClient.invalidateQueries({ queryKey: ['nfts'] });
    queryClient.invalidateQueries({ queryKey: ['nft'] });
    queryClient.invalidateQueries({ queryKey: ['cart'] });
    queryClient.invalidateQueries({ queryKey: ['quote'] });
    if (currentSession?.user?.id) {
      queryClient.invalidateQueries({ queryKey: ['orders', currentSession.user.id] });
      queryClient.invalidateQueries({ queryKey: ['order', currentSession.user.id] });
    }
  });

  socket.on('nft.updated', (payload: NFTUpdatedEventPayload) => {
    if (!payload || !payload.eventId || !payload.resourceId) return;

    if (processedEventIds.has(payload.eventId)) {
      return;
    }

    const resourceKey = `nft:${payload.resourceId}`;
    const currentVer = resourceVersions.get(resourceKey) ?? 0;
    if (payload.version <= currentVer) {
      return;
    }

    processedEventIds.add(payload.eventId);
    resourceVersions.set(resourceKey, payload.version);

    queryClient.setQueryData<{ nft: NFT; related: NFT[] }>(
      ['nft', payload.resourceId],
      (old) => {
        if (!old || old.nft.version >= payload.version) return old;
        return {
          ...old,
          nft: {
            ...old.nft,
            priceEth: payload.priceEth,
            editions: payload.editions,
            version: payload.version,
          },
        };
      }
    );

    queryClient.setQueriesData<NFTListResponse>({ queryKey: ['nfts'] }, (old) => {
      if (!old) return old;
      return {
        ...old,
        items: old.items.map((item) =>
          item.id === payload.resourceId && item.version < payload.version
            ? {
                ...item,
                priceEth: payload.priceEth,
                editions: payload.editions,
                version: payload.version,
              }
            : item
        ),
      };
    });

    queryClient.invalidateQueries({ queryKey: ['cart'] });
    queryClient.invalidateQueries({ queryKey: ['quote'] });

    notifyListeners({
      id: payload.eventId,
      type: 'nft.updated',
      message: `Atualização em tempo real: preço/disponibilidade do NFT atualizado (${payload.priceEth} ETH).`,
      timestamp: payload.timestamp,
    });
  });

  socket.on('order.updated', (payload: OrderUpdatedEventPayload) => {
    if (!payload || !payload.eventId || !payload.resourceId) return;

    const activeSession = getStoredSession();
    if (!activeSession || activeSession.user.id !== payload.userId) {
      return;
    }

    if (processedEventIds.has(payload.eventId)) {
      return;
    }

    const resourceKey = `order:${payload.resourceId}`;
    const currentVer = resourceVersions.get(resourceKey) ?? 0;
    if (payload.version <= currentVer) {
      return;
    }

    const existingCached = queryClient.getQueryData<{ order: Order }>([
      'order',
      activeSession.user.id,
      payload.resourceId,
    ]);
    if (
      existingCached &&
      (existingCached.order.status === 'confirmed' ||
        existingCached.order.status === 'rejected' ||
        existingCached.order.version >= payload.version)
    ) {
      return;
    }

    processedEventIds.add(payload.eventId);
    resourceVersions.set(resourceKey, payload.version);

    queryClient.invalidateQueries({
      queryKey: ['order', activeSession.user.id, payload.resourceId],
    });
    queryClient.invalidateQueries({
      queryKey: ['orders', activeSession.user.id],
    });
    queryClient.invalidateQueries({ queryKey: ['cart'] });
    queryClient.invalidateQueries({ queryKey: ['nfts'] });

    notifyListeners({
      id: payload.eventId,
      type: 'order.updated',
      message:
        payload.status === 'confirmed'
          ? `Pedido #${payload.resourceId} confirmado na blockchain!`
          : payload.status === 'rejected'
          ? `Pedido #${payload.resourceId} recusado: ${payload.failureReason || 'Verifique sua carteira.'}`
          : `Pedido #${payload.resourceId} em processamento.`,
      timestamp: payload.timestamp,
    });
  });

  return socket;
}

export function disconnectRealtimeSocket(): void {
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
  }
}

export function reconnectRealtimeSocket(): void {
  if (socketInstance) {
    if (!socketInstance.connected) {
      socketInstance.connect();
    } else {
      socketInstance.disconnect().connect();
    }
  } else {
    initRealtimeSocket();
  }
}

