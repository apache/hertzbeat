export type ClientSessionState = {
  authenticated: boolean;
};

export type ClientSessionUserSnapshot = {
  name: string;
  avatar: string;
  email: string;
  role?: string;
};

export const HB_UI_SESSION_USER_KEY = 'HB_UI_SESSION_USER';

function readSessionStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readClientSessionUserSnapshot(): ClientSessionUserSnapshot | null {
  const storage = readSessionStorage();
  if (!storage) return null;
  try {
    const value = storage.getItem(HB_UI_SESSION_USER_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<ClientSessionUserSnapshot>;
    if (!parsed.name || typeof parsed.name !== 'string') return null;
    return {
      name: parsed.name,
      avatar: typeof parsed.avatar === 'string' ? parsed.avatar : './assets/img/avatar.svg',
      email: typeof parsed.email === 'string' ? parsed.email : 'administrator',
      ...(typeof parsed.role === 'string' && parsed.role ? { role: parsed.role } : {})
    };
  } catch {
    return null;
  }
}

export function writeClientSessionUserSnapshot(user: ClientSessionUserSnapshot) {
  const storage = readSessionStorage();
  if (!storage) return;
  try {
    storage.setItem(HB_UI_SESSION_USER_KEY, JSON.stringify(user));
  } catch {
    // The user snapshot is an Angular parity convenience, not an auth boundary.
  }
}

export function clearClientSessionUserSnapshot() {
  const storage = readSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(HB_UI_SESSION_USER_KEY);
  } catch {
    // Ignore storage failures during logout/session cleanup.
  }
}

export function clearClientSessionMarker() {
  if (typeof document === 'undefined') return;
  document.cookie = 'hb_ui_session=; Max-Age=0; path=/; SameSite=Lax';
}

export async function readClientSessionState(): Promise<ClientSessionState> {
  try {
    const response = await fetch('/api/account/session', {
      credentials: 'same-origin',
      cache: 'no-store'
    });
    if (!response.ok) {
      clearClientSessionMarker();
      return { authenticated: false };
    }
    const payload = (await response.json()) as ClientSessionState;
    return { authenticated: Boolean(payload.authenticated) };
  } catch {
    clearClientSessionMarker();
    return { authenticated: false };
  }
}

export async function clearClientSession() {
  try {
    await fetch('/api/account/session', {
      method: 'DELETE',
      credentials: 'same-origin',
      cache: 'no-store'
    });
  } finally {
    clearClientSessionMarker();
    clearClientSessionUserSnapshot();
  }
}
