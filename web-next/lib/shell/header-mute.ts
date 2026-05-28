import { apiMessageGet, apiMessagePost } from '@/lib/api-client';

export const HEADER_MUTE_STORAGE_KEY = 'hb.header-mute';
const HEADER_MUTE_TIMEOUT_MS = 3500;

export type HeaderMuteConfig = {
  mute: boolean;
};

export type HeaderMuteLoadState = {
  muted: boolean;
  source: 'api' | 'storage';
};

export type HeaderMuteSaveState = {
  muted: boolean;
  status: 'saved' | 'error';
};

export function normalizeHeaderMuteConfig(config: Partial<HeaderMuteConfig> | boolean | null | undefined): HeaderMuteConfig {
  if (typeof config === 'boolean') {
    return { mute: config };
  }
  return { mute: config?.mute !== false };
}

export function readHeaderMuteStorage(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(HEADER_MUTE_STORAGE_KEY) !== 'false';
}

export function writeHeaderMuteStorage(muted: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(HEADER_MUTE_STORAGE_KEY, String(muted));
}

async function withHeaderMuteTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof globalThis.setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = globalThis.setTimeout(() => reject(new Error('Header mute request timed out')), HEADER_MUTE_TIMEOUT_MS);
      })
    ]);
  } finally {
    if (timeout) {
      globalThis.clearTimeout(timeout);
    }
  }
}

export async function loadHeaderMuteConfig(): Promise<HeaderMuteLoadState> {
  try {
    const config = normalizeHeaderMuteConfig(
      await withHeaderMuteTimeout(apiMessageGet<Partial<HeaderMuteConfig> | boolean>('/config/mute'))
    );
    writeHeaderMuteStorage(config.mute);
    return {
      muted: config.mute,
      source: 'api'
    };
  } catch {
    return {
      muted: readHeaderMuteStorage(),
      source: 'storage'
    };
  }
}

export async function saveHeaderMuteConfig(muted: boolean): Promise<HeaderMuteSaveState> {
  try {
    await withHeaderMuteTimeout(apiMessagePost<unknown>('/config/mute', { mute: muted }));
    writeHeaderMuteStorage(muted);
    return {
      muted,
      status: 'saved'
    };
  } catch {
    return {
      muted,
      status: 'error'
    };
  }
}
