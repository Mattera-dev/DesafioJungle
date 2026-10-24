import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
import { getMockScenario, resetMockDb, setMockScenario } from './db';
import {
  disconnectAllSocketClients,
  simulateNftMutationAndEmit,
  simulateOrderStatusAndEmit,
} from './socket';
import { dispatchNftUpdatedEvent, dispatchOrderUpdatedEvent } from '@/services/realtime';

export const worker = setupWorker(...handlers);

declare global {
  interface Window {
    __KURIO_MOCK__?: {
      resetDb: typeof resetMockDb;
      getScenario: typeof getMockScenario;
      setScenario: typeof setMockScenario;
      emitNftUpdate: typeof simulateNftMutationAndEmit;
      emitOrderUpdate: typeof simulateOrderStatusAndEmit;
      disconnectSockets: typeof disconnectAllSocketClients;
    };
  }
}

export async function startMockWorker() {
  if (typeof window === 'undefined') return;

  window.__KURIO_MOCK__ = {
    resetDb: resetMockDb,
    getScenario: getMockScenario,
    setScenario: setMockScenario,
    emitNftUpdate: (options) => {
      const evt = simulateNftMutationAndEmit(options);
      if (evt) {
        dispatchNftUpdatedEvent(evt);
      }
      return evt;
    },
    emitOrderUpdate: (options) => {
      const evt = simulateOrderStatusAndEmit(options);
      if (evt) {
        dispatchOrderUpdatedEvent(evt);
      }
      return evt;
    },
    disconnectSockets: disconnectAllSocketClients,
  };

  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
  });
}

