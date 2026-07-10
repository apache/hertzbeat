type WorkbenchLoadCacheOptions = {
  settledTtlMs?: number;
  now?: () => number;
};

type WorkbenchLoadCacheEntry<T> = {
  promise: Promise<T>;
  settled: boolean;
  expiresAt: number;
};

const workbenchLoadCache = new Map<string, WorkbenchLoadCacheEntry<unknown>>();

function resolveNow(options: WorkbenchLoadCacheOptions) {
  return options.now ? options.now() : Date.now();
}

export function consumeWorkbenchLoad<T>(
  cacheKey: string,
  load: () => Promise<T>,
  options: WorkbenchLoadCacheOptions = {}
) {
  const now = resolveNow(options);
  const existing = workbenchLoadCache.get(cacheKey) as WorkbenchLoadCacheEntry<T> | undefined;
  if (existing && (!existing.settled || existing.expiresAt > now)) {
    return existing.promise;
  }
  if (existing) {
    workbenchLoadCache.delete(cacheKey);
  }

  const settledTtlMs = Math.max(0, options.settledTtlMs ?? 0);
  let entry: WorkbenchLoadCacheEntry<T> | null = null;
  const promise = load().then(
    value => {
      if (!entry) return value;
      entry.settled = true;
      if (settledTtlMs > 0) {
        entry.expiresAt = resolveNow(options) + settledTtlMs;
      } else if (workbenchLoadCache.get(cacheKey) === entry) {
        workbenchLoadCache.delete(cacheKey);
      }
      return value;
    },
    error => {
      if (entry && workbenchLoadCache.get(cacheKey) === entry) {
        workbenchLoadCache.delete(cacheKey);
      }
      throw error;
    }
  );

  entry = {
    promise,
    settled: false,
    expiresAt: Number.POSITIVE_INFINITY,
  };

  workbenchLoadCache.set(cacheKey, entry);
  return promise;
}

export function resetWorkbenchLoadCache() {
  workbenchLoadCache.clear();
}

export function forgetWorkbenchLoad(cacheKey: string) {
  workbenchLoadCache.delete(cacheKey);
}
