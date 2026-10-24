import { User } from '@/types/contracts';

const AUTH_STORAGE_KEY = 'kurio_auth_session_v1';

export interface StoredAuthSession {
  user: User;
  token: string;
  expiresAt: string;
}

type AuthListener = (session: StoredAuthSession | null) => void;
const listeners = new Set<AuthListener>();

export function getStoredSession(): StoredAuthSession | null {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(AUTH_STORAGE_KEY) : null;
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuthSession;
  } catch {
    return null;
  }
}

export function setStoredSession(session: StoredAuthSession | null): void {
  try {
    if (typeof window !== 'undefined') {
      if (session) {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      } else {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  } catch {
    // ignore
  }
  for (const listener of listeners) {
    listener(session);
  }
}

export function subscribeAuthSession(listener: AuthListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

