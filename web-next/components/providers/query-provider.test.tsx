import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { hertzBeatQueryDefaults, HertzBeatQueryProvider } from './query-provider';

describe('HertzBeatQueryProvider', () => {
  it('uses Horizon-style short stale query defaults', () => {
    expect(hertzBeatQueryDefaults.queries).toMatchObject({
      staleTime: 5000,
      refetchOnWindowFocus: true,
      retry: 1
    });
  });

  it('renders children through the shared QueryClientProvider', () => {
    const html = renderToStaticMarkup(
      <HertzBeatQueryProvider>
        <span data-query-provider-child="true">ready</span>
      </HertzBeatQueryProvider>
    );

    expect(html).toContain('data-query-provider-child="true"');
  });
});
