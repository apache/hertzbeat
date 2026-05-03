import type { CodeNavigationHint } from './types';

type SearchParamReader = {
  get: (name: string) => string | null;
};

function trimText(value?: string | null): string | undefined {
  if (value == null) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function normalizeProvider(provider?: string, repositoryUrl?: string): string | undefined {
  const normalizedProvider = provider?.trim().toLowerCase();
  if (normalizedProvider) {
    return normalizedProvider;
  }
  if (repositoryUrl?.includes('github.com')) return 'github';
  if (repositoryUrl?.includes('gitlab.com')) return 'gitlab';
  if (repositoryUrl?.includes('gitee.com')) return 'gitee';
  return undefined;
}

function normalizeCodePath(path?: string): string | undefined {
  if (path == null) return undefined;
  return path.replace(/^\/+/, '').replace(/\/+$/, '') || undefined;
}

export function readCodeNavigationHint(params: SearchParamReader): CodeNavigationHint | undefined {
  const repositoryUrl = params.get('codeRepo');
  if (!repositoryUrl) return undefined;
  return {
    repositoryUrl,
    provider: params.get('codeProvider') || undefined,
    defaultPath: params.get('codePath') || undefined,
    searchQuery: params.get('codeSearch') || undefined,
    label: params.get('codeLabel') || undefined
  };
}

export function buildCodeNavigationUrl(hint?: CodeNavigationHint | null): string | undefined {
  const repositoryUrl = trimText(hint?.repositoryUrl);
  if (repositoryUrl == null) {
    return undefined;
  }
  const normalizedRepositoryUrl = repositoryUrl.replace(/\/+$/, '');
  const provider = normalizeProvider(trimText(hint?.provider), normalizedRepositoryUrl);
  const defaultPath = normalizeCodePath(trimText(hint?.defaultPath));
  const searchQuery = trimText(hint?.searchQuery);

  if (provider === 'github') {
    const query = [defaultPath != null ? `path:${defaultPath}` : undefined, searchQuery].filter(Boolean).join(' ');
    return query === '' ? normalizedRepositoryUrl : `${normalizedRepositoryUrl}/search?q=${encodeURIComponent(query)}&type=code`;
  }
  if (provider === 'gitlab') {
    const query = [searchQuery, defaultPath].filter(Boolean).join(' ');
    return query === '' ? normalizedRepositoryUrl : `${normalizedRepositoryUrl}/-/search?scope=blobs&search=${encodeURIComponent(query)}`;
  }
  if (provider === 'gitee') {
    const query = [defaultPath, searchQuery].filter(Boolean).join(' ');
    return query === '' ? normalizedRepositoryUrl : `${normalizedRepositoryUrl}/search?scope=repository&q=${encodeURIComponent(query)}`;
  }
  return normalizedRepositoryUrl;
}
