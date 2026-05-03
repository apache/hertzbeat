import { describe, expect, it } from 'vitest';
import { buildCodeNavigationUrl, readCodeNavigationHint } from './code-navigation';

describe('code navigation helper', () => {
  it('reads code navigation hint from search params', () => {
    const params = new URLSearchParams('codeRepo=https://github.com/apache/hertzbeat&codeProvider=github&codePath=web-next&codeSearch=trace');
    expect(readCodeNavigationHint(params)).toEqual({
      repositoryUrl: 'https://github.com/apache/hertzbeat',
      provider: 'github',
      defaultPath: 'web-next',
      searchQuery: 'trace',
      label: undefined
    });
  });

  it('builds provider-aware code navigation urls', () => {
    expect(
      buildCodeNavigationUrl({
        repositoryUrl: 'https://github.com/apache/hertzbeat',
        provider: 'github',
        defaultPath: 'web-next',
        searchQuery: 'trace'
      })
    ).toBe('https://github.com/apache/hertzbeat/search?q=path%3Aweb-next%20trace&type=code');
  });
});
