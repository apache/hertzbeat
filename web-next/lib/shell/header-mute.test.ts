import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HEADER_MUTE_STORAGE_KEY,
  loadHeaderMuteConfig,
  normalizeHeaderMuteConfig,
  readHeaderMuteStorage,
  saveHeaderMuteConfig,
  writeHeaderMuteStorage
} from './header-mute';

vi.mock('@/lib/api-client', () => ({
  apiMessageGet: vi.fn(),
  apiMessagePost: vi.fn()
}));

function installLocalStorageMock() {
  const storage = new Map<string, string>();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      clear: () => storage.clear()
    }
  });
}

describe('header mute controller', () => {
  beforeEach(() => {
    installLocalStorageMock();
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('normalizes the Angular /config/mute payload with mute defaulting to true', () => {
    expect(normalizeHeaderMuteConfig({ mute: false })).toEqual({ mute: false });
    expect(normalizeHeaderMuteConfig({})).toEqual({ mute: true });
    expect(normalizeHeaderMuteConfig(true)).toEqual({ mute: true });
  });

  it('reads and writes the local fallback cache using the existing header key', () => {
    expect(readHeaderMuteStorage()).toBe(true);
    writeHeaderMuteStorage(false);
    expect(window.localStorage.getItem(HEADER_MUTE_STORAGE_KEY)).toBe('false');
    expect(readHeaderMuteStorage()).toBe(false);
  });

  it('loads /config/mute and mirrors the result into local storage', async () => {
    const { apiMessageGet } = await import('@/lib/api-client');
    vi.mocked(apiMessageGet).mockResolvedValueOnce({ mute: false });

    await expect(loadHeaderMuteConfig()).resolves.toEqual({ muted: false, source: 'api' });
    expect(apiMessageGet).toHaveBeenCalledWith('/config/mute');
    expect(window.localStorage.getItem(HEADER_MUTE_STORAGE_KEY)).toBe('false');
  });

  it('falls back to local storage when /config/mute cannot be loaded', async () => {
    const { apiMessageGet } = await import('@/lib/api-client');
    writeHeaderMuteStorage(false);
    vi.mocked(apiMessageGet).mockRejectedValueOnce(new Error('503'));

    await expect(loadHeaderMuteConfig()).resolves.toEqual({ muted: false, source: 'storage' });
  });

  it('saves /config/mute before updating the local fallback cache', async () => {
    const { apiMessagePost } = await import('@/lib/api-client');
    vi.mocked(apiMessagePost).mockResolvedValueOnce({});

    await expect(saveHeaderMuteConfig(true)).resolves.toEqual({ muted: true, status: 'saved' });
    expect(apiMessagePost).toHaveBeenCalledWith('/config/mute', { mute: true });
    expect(window.localStorage.getItem(HEADER_MUTE_STORAGE_KEY)).toBe('true');
  });

  it('keeps the Angular success-only update contract when /config/mute save fails', async () => {
    const { apiMessagePost } = await import('@/lib/api-client');
    writeHeaderMuteStorage(true);
    vi.mocked(apiMessagePost).mockRejectedValueOnce(new Error('500'));

    await expect(saveHeaderMuteConfig(false)).resolves.toEqual({ muted: false, status: 'error' });
    expect(apiMessagePost).toHaveBeenCalledWith('/config/mute', { mute: false });
    expect(window.localStorage.getItem(HEADER_MUTE_STORAGE_KEY)).toBe('true');
  });
});
