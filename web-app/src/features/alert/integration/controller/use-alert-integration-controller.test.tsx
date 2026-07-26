/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { useAlertIntegrationController } from './use-alert-integration-controller';

describe('useAlertIntegrationController', () => {
  it('switches canonical sources without placing credentials in navigation state', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const { result } = renderController('/alerts/integrations/webhook');
    expect(result.current.source?.id).toBe('webhook');

    await act(() => result.current.actions.copyEndpoint());
    expect(result.current.copyState).toEqual({ target: 'endpoint', outcome: 'copied' });

    act(() => void result.current.actions.selectSource('prometheus'));
    await waitFor(() => expect(result.current.source?.id).toBe('prometheus'));
    expect(result.current.contract?.endpoint).toBe(`${window.location.origin}/api/v2/alerts`);
    expect(result.current.copyState).toBeNull();
  });

  it('copies only the stable endpoint and placeholder header contracts', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const { result } = renderController('/alerts/integrations/zabbix');

    await act(() => result.current.actions.copyEndpoint());
    await act(() => result.current.actions.copyAuthorizationHeader());

    expect(writeText).toHaveBeenNthCalledWith(1, `${window.location.origin}/api/alerts/report/zabbix`);
    expect(writeText).toHaveBeenNthCalledWith(2, 'Authorization: Bearer <api-token>');
  });

  it('keeps an unknown source unresolved for the normal not-found surface', () => {
    const { result } = renderController('/alerts/integrations/unknown');
    expect(result.current.source).toBeUndefined();
    expect(result.current.contract).toBeUndefined();
  });

  it('scopes a clipboard failure to the contract that failed', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('clipboard unavailable'));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const { result } = renderController('/alerts/integrations/zabbix');

    await act(() => result.current.actions.copyEndpoint());

    expect(result.current.copyState).toEqual({ target: 'endpoint', outcome: 'failed' });
  });
});

function renderController(path: string) {
  const wrapper = ({ children }: PropsWithChildren) => (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/alerts/integrations/:source" element={children} />
      </Routes>
    </MemoryRouter>
  );
  return renderHook(() => useAlertIntegrationController(), { wrapper });
}
