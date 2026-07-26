/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAlertLabelSuggestionController } from './use-alert-label-suggestion-controller';

const settings = vi.hoisted(() => ({ loadLabelSuggestions: vi.fn() }));
vi.mock('@/features/settings', () => settings);

describe('Alert label suggestion controller', () => {
  beforeEach(() => vi.resetAllMocks());

  it('publishes server-backed keys and forwards query cancellation', async () => {
    settings.loadLabelSuggestions.mockResolvedValue({
      keys: ['environment'],
      valuesByKey: { environment: ['prod'] }
    });
    const { result } = renderSuggestionController();

    await waitFor(() => expect(result.current.kind).toBe('received'));

    expect(result.current.keys).toContain('environment');
    expect(settings.loadLabelSuggestions).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it('retains the proven manual fallback when the optional suggestion read fails', async () => {
    settings.loadLabelSuggestions.mockRejectedValue(new Error('unavailable'));
    const { result } = renderSuggestionController();

    await waitFor(() => expect(result.current.kind).toBe('fallback'));

    expect(result.current.keys).toContain('service');
  });
});

function renderSuggestionController() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(useAlertLabelSuggestionController, { wrapper });
}
