const workbenchLoadCache = new Map<string, Promise<unknown>>();

export function consumeWorkbenchLoad<T>(cacheKey: string, load: () => Promise<T>) {
  const existing = workbenchLoadCache.get(cacheKey) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }

  const promise = load().finally(() => {
    if (workbenchLoadCache.get(cacheKey) === promise) {
      workbenchLoadCache.delete(cacheKey);
    }
  });

  workbenchLoadCache.set(cacheKey, promise);
  return promise;
}

export function resetWorkbenchLoadCache() {
  workbenchLoadCache.clear();
}
