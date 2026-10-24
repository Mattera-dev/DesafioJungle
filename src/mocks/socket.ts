import { ws } from 'msw';
import { toSocketIo } from '@mswjs/socket.io-binding';
import {
  NFTUpdatedEventPayload,
  OrderStatus,
  OrderUpdatedEventPayload,
} from '@/types/contracts';
import { getDb, saveDb } from './db';

const socketLink = ws.link(/\/socket\.io\//);

interface ConnectedClient {
  id: string;
  userId: string | null;
  io: ReturnType<typeof toSocketIo>;
  rawSend: (packet: string) => void;
  close: () => void;
}

const activeClients = new Set<ConnectedClient>();

export const socketHandlers = [
  socketLink.addEventListener('connection', (connection) => {
    const io = toSocketIo(connection);
    const url = new URL(connection.client.url);
    const token = url.searchParams.get('token');
    const db = getDb();
    const session = token ? db.sessions[token] : undefined;

    const clientEntry: ConnectedClient = {
      id: Math.random().toString(36).slice(2),
      userId: session ? session.userId : null,
      io,
      rawSend: (packet: string) => {
        try {
          connection.client.send(packet);
        } catch {
          void 0;
        }
      },
      close: () => {
        try {
          connection.client.close();
        } catch {
          void 0;
        }
      },
    };

    activeClients.add(clientEntry);

    connection.client.addEventListener('message', (event) => {
      if (typeof event.data === 'string' && event.data.startsWith('40')) {
        connection.client.send('40{"sid":"kurio-mock-sid"}');
      } else if (typeof event.data === 'string' && event.data === '2') {
        connection.client.send('3');
      } else if (typeof event.data === 'string' && event.data.startsWith('42')) {
        try {
          const parsed = JSON.parse(event.data.slice(2)) as [string, unknown];
          const [evtName, evtPayload] = parsed;
          if (evtName === 'auth:bind' && evtPayload && typeof evtPayload === 'object') {
            const tok = (evtPayload as { token?: string }).token;
            const currentDb = getDb();
            const boundSession = tok ? currentDb.sessions[tok] : undefined;
            clientEntry.userId = boundSession ? boundSession.userId : null;
          } else if (evtName === 'auth:unbind') {
            clientEntry.userId = null;
          }
        } catch {
          void 0;
        }
      }
    });

    io.client.on('auth:bind', (...args: unknown[]) => {
      const payload = (
        args.length > 1 && typeof args[1] === 'object' ? args[1] : args[0]
      ) as { token?: string } | undefined;
      const currentDb = getDb();
      const boundSession = payload?.token ? currentDb.sessions[payload.token] : undefined;
      clientEntry.userId = boundSession ? boundSession.userId : null;
    });

    io.client.on('auth:unbind', () => {
      clientEntry.userId = null;
    });

    connection.client.addEventListener('close', () => {
      activeClients.delete(clientEntry);
    });
  }),
];

export function broadcastNftUpdated(payload: NFTUpdatedEventPayload): void {
  const rawPacket = `42${JSON.stringify(['nft.updated', payload])}`;
  for (const client of activeClients) {
    try {
      client.io.client.emit('nft.updated', payload);
      client.rawSend(rawPacket);
    } catch {
      void 0;
    }
  }
}

export function broadcastOrderUpdated(payload: OrderUpdatedEventPayload): void {
  const rawPacket = `42${JSON.stringify(['order.updated', payload])}`;
  for (const client of activeClients) {
    if (client.userId && client.userId === payload.userId) {
      try {
        client.io.client.emit('order.updated', payload);
        client.rawSend(rawPacket);
      } catch {
        void 0;
      }
    }
  }
}

export function simulateNftMutationAndEmit(options: {
  nftId: string;
  newPriceEth?: string;
  editionType?: '1/1' | '1/10' | '1/50' | 'ABERTA';
  newAvailable?: number;
  forceVersion?: number;
  eventId?: string;
}): NFTUpdatedEventPayload | null {
  const db = getDb();
  const nft = db.nfts.find((n) => n.id === options.nftId);
  if (!nft) return null;

  const nextVersion = options.forceVersion ?? nft.version + 1;
  if (options.forceVersion === undefined || options.forceVersion > nft.version) {
    nft.version = nextVersion;
    if (options.newPriceEth) {
      nft.priceEth = options.newPriceEth;
      for (const ed of nft.editions) {
        ed.priceEth = options.newPriceEth;
      }
    }
    if (options.editionType && typeof options.newAvailable === 'number') {
      const ed = nft.editions.find((e) => e.type === options.editionType);
      if (ed) {
        ed.available = options.newAvailable;
      }
    }
    for (const cart of Object.values(db.cartsByOwner)) {
      if (cart.items.some((i) => i.nftId === nft.id)) {
        cart.quoteVersion += 1;
      }
    }
    saveDb();
  }

  const eventPayload: NFTUpdatedEventPayload = {
    eventId: options.eventId || `evt-nft-${nft.id}-v${nextVersion}-${Date.now()}`,
    resourceId: nft.id,
    version: nextVersion,
    timestamp: new Date().toISOString(),
    priceEth: options.newPriceEth ?? nft.priceEth,
    editions: structuredClone(nft.editions),
  };

  broadcastNftUpdated(eventPayload);
  return eventPayload;
}

export function simulateOrderStatusAndEmit(options: {
  orderId: string;
  status: OrderStatus;
  failureReason?: string;
  forceVersion?: number;
  eventId?: string;
}): OrderUpdatedEventPayload | null {
  const db = getDb();
  const order = db.orders.find((o) => o.id === options.orderId);
  if (!order) return null;

  const isOldEventTest =
    options.forceVersion !== undefined && options.forceVersion <= order.version;

  if (!isOldEventTest && (order.status === 'confirmed' || order.status === 'rejected')) {
    return null;
  }

  const nextVersion = options.forceVersion ?? order.version + 1;

  if (!isOldEventTest) {
    order.status = options.status;
    order.version = nextVersion;
    order.updatedAt = new Date().toISOString();
    if (options.failureReason) {
      order.failureReason = options.failureReason;
    }

    if (options.status === 'confirmed') {
      const cartsToClean = [
        db.cartsByOwner[order.userId],
        db.cartsByOwner['guest'],
      ].filter(Boolean);

      for (const purchased of order.items) {
        const nft = db.nfts.find((n) => n.id === purchased.nftId);
        const edition = nft?.editions.find((e) => e.type === purchased.edition);
        if (edition) {
          edition.available = Math.max(0, edition.available - purchased.quantity);
        }
        for (const targetCart of cartsToClean) {
          const cartItemIdx = targetCart.items.findIndex(
            (ci) => ci.nftId === purchased.nftId && ci.edition === purchased.edition
          );
          if (cartItemIdx !== -1) {
            const ci = targetCart.items[cartItemIdx];
            if (ci.quantity <= purchased.quantity) {
              targetCart.items.splice(cartItemIdx, 1);
            } else {
              ci.quantity -= purchased.quantity;
            }
          }
        }
      }
      for (const targetCart of cartsToClean) {
        targetCart.quoteVersion += 1;
        if (targetCart.items.length === 0) {
          targetCart.couponCode = null;
        }
      }
    }
    saveDb();
  }

  const payload: OrderUpdatedEventPayload = {
    eventId: options.eventId || `evt-order-${order.id}-v${nextVersion}-${Date.now()}`,
    resourceId: order.id,
    userId: order.userId,
    version: nextVersion,
    timestamp: new Date().toISOString(),
    status: options.status,
    transactionHash: order.transactionHash,
    failureReason: options.failureReason,
  };

  broadcastOrderUpdated(payload);
  return payload;
}

export function disconnectAllSocketClients(): void {
  for (const client of Array.from(activeClients)) {
    client.close();
  }
  activeClients.clear();
}
