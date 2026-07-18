/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { tokenGenerateActionUrl, tokenRevokeActionUrl } from '../api/token-api';
import { useTokenResourceController } from './token-resource-controller';

const refine = vi.hoisted(() => ({
  custom: vi.fn(),
  notification: vi.fn(),
  provider: vi.fn(),
  refetch: vi.fn(),
  useDataProvider: vi.fn(),
  useList: vi.fn(),
  useNotification: vi.fn()
}));
const clipboard = vi.hoisted(() => ({ writeText: vi.fn() }));

vi.mock('@refinedev/core', () => ({
  useDataProvider: refine.useDataProvider,
  useList: refine.useList,
  useNotification: refine.useNotification
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));
vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams('scope=otlp-ingest')]
}));

const record = {
  id: 7,
  name: 'Collector',
  tokenMask: 'eyJh****once',
  tokenScope: 'otlp-ingest' as const,
  workspaceId: 'default',
  creator: 'admin',
  gmtCreate: null,
  expireTime: null,
  lastUsedTime: null
};

describe('Token resource controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
    refine.provider.mockReturnValue({ custom: refine.custom });
    refine.useDataProvider.mockReturnValue(refine.provider);
    refine.useList.mockReturnValue(buildListResult());
    refine.useNotification.mockReturnValue({ open: refine.notification });
    refine.refetch.mockResolvedValue({ data: { data: [record], total: 1 }, isError: false });
  });

  it('uses the named Refine list and exposes honest list evidence', () => {
    const { result, rerender } = renderHook(() => useTokenResourceController());

    expect(refine.useList).toHaveBeenCalledWith(expect.objectContaining({
      resource: 'tokens', dataProviderName: 'tokens', errorNotification: false
    }));
    expect(refine.provider).toHaveBeenCalledWith('tokens');
    expect(result.current.state.list).toMatchObject({ kind: 'ready', records: [record] });

    refine.useList.mockReturnValue(buildListResult({ isError: true, error: { statusCode: 503 }, data: [] }));
    rerender();
    expect(result.current.state.list.kind).toBe('unavailable');
    refine.useList.mockReturnValue(buildListResult({
      isError: true,
      error: { statusCode: 502, code: 'TOKEN_RESPONSE_INVALID' },
      data: []
    }));
    rerender();
    expect(result.current.state.list.kind).toBe('error');
  });

  it('keeps the one-time receipt only in React state and preserves it when list reread fails', async () => {
    refine.custom.mockResolvedValue({ data: { id: 'generated', token: 'hb_generated_once' } });
    refine.refetch.mockRejectedValue({ statusCode: 503 });
    const { result } = renderHook(() => useTokenResourceController());

    act(() => result.current.openGenerator());
    act(() => result.current.updateDraft({
      name: 'Production Collector', expireSeconds: -1, scope: 'otlp-ingest'
    }));
    await act(async () => result.current.generate());

    expect(refine.custom).toHaveBeenCalledWith({
      url: tokenGenerateActionUrl,
      method: 'post',
      payload: { name: 'Production Collector', expireSeconds: -1, scope: 'otlp-ingest' }
    });
    expect(result.current.state.generatedToken).toBe('hb_generated_once');
    expect(result.current.state.list.kind).toBe('unavailable');
    expect(refine.notification).toHaveBeenCalledWith({ message: 'token.unavailable', type: 'error' });
    expect(JSON.stringify(refine.notification.mock.calls)).not.toContain('hb_generated_once');

    await act(async () => result.current.copyGeneratedToken());
    expect(clipboard.writeText).toHaveBeenCalledWith('hb_generated_once');
    act(() => result.current.closeGeneratedToken());
    expect(result.current.state.generatedToken).toBeNull();
  });

  it('confirms revocation only after an authoritative list reread', async () => {
    refine.custom.mockResolvedValue({ data: { id: 7 } });
    refine.refetch.mockResolvedValue({ data: { data: [], total: 0 }, isError: false });
    const { result } = renderHook(() => useTokenResourceController());

    await act(async () => result.current.revoke(7));

    expect(refine.custom).toHaveBeenCalledWith({ url: tokenRevokeActionUrl(7), method: 'delete' });
    expect(refine.refetch).toHaveBeenCalledTimes(1);
    expect(refine.notification).toHaveBeenCalledWith({ message: 'token.revokeSuccess', type: 'success' });
  });

  it('keeps revocation unconfirmed when the authoritative list still contains the id', async () => {
    refine.custom.mockResolvedValue({ data: { id: 7 } });
    const { result } = renderHook(() => useTokenResourceController());

    await act(async () => result.current.revoke(7));

    expect(refine.notification).not.toHaveBeenCalledWith(expect.objectContaining({
      message: 'token.revokeSuccess'
    }));
    expect(refine.notification).toHaveBeenCalledWith({ message: 'common.routeError.description', type: 'error' });
    expect(refine.notification).not.toHaveBeenCalledWith(expect.objectContaining({ message: 'token.unavailable' }));
    expect(result.current.state.list.kind).toBe('error');
  });

  it('keeps revocation unconfirmed when its authoritative reread fails', async () => {
    refine.custom.mockResolvedValue({ data: { id: 7 } });
    refine.refetch.mockRejectedValue({ statusCode: 500 });
    const { result } = renderHook(() => useTokenResourceController());

    await act(async () => result.current.revoke(7));

    expect(refine.notification).not.toHaveBeenCalledWith(expect.objectContaining({
      message: 'token.revokeSuccess'
    }));
    expect(refine.notification).toHaveBeenCalledWith({ message: 'common.routeError.description', type: 'error' });
    await waitFor(() => expect(result.current.state.list.kind).toBe('error'));
  });

  it('reports a contract refresh as error without discarding the one-time receipt', async () => {
    refine.custom.mockResolvedValue({ data: { id: 'generated', token: 'hb_generated_once' } });
    refine.refetch.mockRejectedValue({ statusCode: 502, code: 'TOKEN_RESPONSE_INVALID' });
    const { result } = renderHook(() => useTokenResourceController());

    act(() => result.current.openGenerator());
    act(() => result.current.updateDraft({ name: 'Collector', expireSeconds: -1, scope: 'otlp-ingest' }));
    await act(async () => result.current.generate());

    expect(result.current.state.generatedToken).toBe('hb_generated_once');
    expect(result.current.state.list.kind).toBe('error');
    expect(refine.notification).toHaveBeenCalledWith({ message: 'common.routeError.description', type: 'error' });
    expect(refine.notification).not.toHaveBeenCalledWith(expect.objectContaining({ message: 'token.unavailable' }));
  });

  it('reports generate and revoke failure when the provider has no custom action', async () => {
    refine.provider.mockReturnValue({});
    const { result } = renderHook(() => useTokenResourceController());

    act(() => result.current.openGenerator());
    act(() => result.current.updateDraft({ name: 'Collector', expireSeconds: -1, scope: 'otlp-ingest' }));
    await act(async () => result.current.generate());
    await act(async () => result.current.revoke(7));

    expect(refine.notification).toHaveBeenCalledWith({ message: 'token.generateFailed', type: 'error' });
    expect(refine.notification).toHaveBeenCalledWith({ message: 'token.revokeFailed', type: 'error' });
  });
});

function buildListResult(override: Record<string, unknown> = {}) {
  return {
    query: {
      error: null,
      isError: false,
      isFetching: false,
      isPending: false,
      refetch: refine.refetch,
      ...override
    },
    result: {
      data: Object.hasOwn(override, 'data') ? override.data : [record],
      total: Object.hasOwn(override, 'total') ? override.total : 1
    }
  };
}
