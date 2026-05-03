export const WORKBENCH_THEME_STORAGE_KEY = 'theme';

export type WorkbenchTheme = 'dark-ops' | 'light-ops' | 'compact';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
type DocumentLike = Pick<Document, 'documentElement' | 'body'>;
type LocationLike = Pick<Location, 'reload'>;

export function normalizeWorkbenchTheme(theme?: string | null): WorkbenchTheme {
  if (theme === 'light-ops' || theme === 'default') {
    return 'light-ops';
  }
  if (theme === 'compact') {
    return 'compact';
  }
  return 'dark-ops';
}

export function readWorkbenchTheme(
  storage: Pick<Storage, 'getItem'> | null | undefined = typeof window !== 'undefined' ? window.localStorage : null
) {
  const storedTheme = storage?.getItem(WORKBENCH_THEME_STORAGE_KEY) ?? null;
  return normalizeWorkbenchTheme(storedTheme);
}

export function applyWorkbenchTheme(
  theme?: string | null,
  {
    documentLike = typeof document !== 'undefined' ? document : null,
    storage = typeof window !== 'undefined' ? window.localStorage : null
  }: {
    documentLike?: DocumentLike | null;
    storage?: StorageLike | null;
  } = {}
) {
  const normalizedTheme = normalizeWorkbenchTheme(theme);
  documentLike?.documentElement?.setAttribute('data-theme', normalizedTheme);
  documentLike?.body?.setAttribute('data-theme', normalizedTheme);
  storage?.setItem(WORKBENCH_THEME_STORAGE_KEY, normalizedTheme);
  return normalizedTheme;
}

export function bootstrapWorkbenchTheme({
  documentLike = typeof document !== 'undefined' ? document : null,
  storage = typeof window !== 'undefined' ? window.localStorage : null
}: {
  documentLike?: DocumentLike | null;
  storage?: StorageLike | null;
} = {}) {
  return applyWorkbenchTheme(readWorkbenchTheme(storage), { documentLike, storage });
}

export function reloadWorkbenchWindow(
  locationLike: LocationLike | null | undefined = typeof window !== 'undefined' ? window.location : null
) {
  locationLike?.reload();
}
