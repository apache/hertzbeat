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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { tokenGenerateActionUrl, tokenRevokeActionUrl } from '../api/token-api';
import { TokenRequestFailure } from '../model/token-failure';
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
    refine.custom.mockReset();
    refine.refetch.mockReset();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
    refine.provider.mockReturnValue({ custom: refine.custom });
    refine.useDataProvider.mockReturnValue(refine.provider);
    refine.useList.mockReturnValue(buildListResult());
    refine.useNotification.mockReturnValue({ open: refine.notification });
    refine.refetch.mockResolvedValue({ data: { data: [record], total: 1 }, isError: false });
  });

  afterEach(() => vi.restoreAllMocks());

  it('uses the named Refine list and exposes honest list evidence', () => {
    const { result, rerender } = renderHook(() => useTokenResourceController());

    expect(refine.useList).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: 'tokens',
        dataProviderName: 'tokens',
        errorNotification: false
      })
    );
    expect(refine.provider).toHaveBeenCalledWith('tokens');
    expect(result.current.state.list).toMatchObject({ kind: 'ready', records: [record] });

    refine.useList.mockReturnValue(buildListResult({ isError: true, error: unavailableFailure(), data: [] }));
    rerender();
    expect(result.current.state.list.kind).toBe('unavailable');
    refine.useList.mockReturnValue(
      buildListResult({
        isError: true,
        error: invalidFailure(),
        data: []
      })
    );
    rerender();
    expect(result.current.state.list.kind).toBe('error');
    refine.useList.mockReturnValue(buildListResult({ isError: true, error: { statusCode: 503 }, data: [] }));
    rerender();
    expect(result.current.state.list.kind).toBe('error');
  });

  it.each([
    ['missing total', { data: [], total: undefined }],
    ['truncated records', { data: [], total: 1 }],
    ['impossible total', { data: [record], total: 0 }]
  ])('does not present %s as an honest empty or ready list', (_label, evidence) => {
    refine.useList.mockReturnValue(buildListResult(evidence));

    const { result } = renderHook(() => useTokenResourceController());

    expect(result.current.state.list.kind).toBe('error');
  });

  it('keeps the one-time receipt only in React state and preserves it when list reread fails', async () => {
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    refine.custom.mockResolvedValue({ data: { id: 'generated', token: 'hb_generated_once' } });
    refine.refetch.mockRejectedValue(unavailableFailure());
    const { result } = renderHook(() => useTokenResourceController());

    act(() => result.current.openGenerator());
    act(() =>
      result.current.updateDraft({
        name: 'Production Collector',
        expireSeconds: -1,
        scope: 'otlp-ingest'
      })
    );
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
    expect(window.location.href).not.toContain('hb_generated_once');
    expect(JSON.stringify(storageWrite.mock.calls)).not.toContain('hb_generated_once');
    expect(
      JSON.stringify([
        ...log.mock.calls,
        ...info.mock.calls,
        ...debug.mock.calls,
        ...warn.mock.calls,
        ...error.mock.calls
      ])
    ).not.toContain('hb_generated_once');

    await act(async () => result.current.copyGeneratedToken());
    expect(clipboard.writeText).toHaveBeenCalledWith('hb_generated_once');
    act(() => result.current.closeGeneratedToken());
    expect(result.current.state.generatedToken).toBeNull();
  });

  it('admits only one generate command when submit is called twice in the same tick', async () => {
    const generation = deferred<{ data: { id: 'generated'; token: string } }>();
    refine.custom.mockReturnValue(generation.promise);
    const { result } = renderHook(() => useTokenResourceController());

    act(() => result.current.openGenerator());
    act(() => result.current.updateDraft({ name: 'Collector', expireSeconds: -1, scope: 'otlp-ingest' }));

    let first: Promise<void>;
    let second: Promise<void>;
    act(() => {
      first = result.current.generate();
      second = result.current.generate();
    });

    expect(refine.custom).toHaveBeenCalledTimes(1);

    generation.resolve({ data: { id: 'generated', token: 'hb_generated_once' } });
    await act(async () => Promise.all([first!, second!]));
  });

  it('keeps the active generation draft unchanged when controller actions race the locked UI', async () => {
    const generation = deferred<{ data: { id: 'generated'; token: string } }>();
    refine.custom.mockReturnValue(generation.promise);
    const { result } = renderHook(() => useTokenResourceController());

    const activeDraft = { name: 'Collector', expireSeconds: -1, scope: 'otlp-ingest' as const };
    act(() => result.current.openGenerator());
    act(() => result.current.updateDraft(activeDraft));

    let pending: Promise<void>;
    act(() => {
      pending = result.current.generate();
    });
    act(() => {
      result.current.updateDraft({ ...activeDraft, name: 'Late edit' });
      result.current.openGenerator();
    });

    expect(result.current.state.draft).toEqual(activeDraft);
    expect(result.current.state.generating).toBe(true);

    generation.resolve({ data: { id: 'generated', token: 'hb_generated_once' } });
    await act(async () => pending!);
  });

  it('does not let controller actions retire a generation whose write result is still pending', async () => {
    const generation = deferred<{ data: { id: 'generated'; token: string } }>();
    refine.custom.mockReturnValue(generation.promise);
    const { result } = renderHook(() => useTokenResourceController());

    act(() => result.current.openGenerator());
    act(() => result.current.updateDraft({ name: 'Old draft', expireSeconds: -1, scope: 'otlp-ingest' }));

    let pending: Promise<void>;
    act(() => {
      pending = result.current.generate();
    });
    act(() => result.current.closeGenerator());
    act(() => result.current.openGenerator());

    generation.resolve({ data: { id: 'generated', token: 'hb_old_secret' } });
    await act(async () => pending!);

    expect(result.current.state.draft).toBeNull();
    expect(result.current.state.generatedToken).toBe('hb_old_secret');
    expect(result.current.state.generating).toBe(false);
    expect(refine.refetch).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(refine.notification.mock.calls)).not.toContain('hb_old_secret');
  });

  it.each(ambiguousWriteFailures)(
    'retains a non-retryable generation receipt after an ambiguous %s outcome',
    async (_label, failure) => {
      refine.custom.mockRejectedValueOnce(failure());
      const { result } = renderHook(() => useTokenResourceController());
      const draft = { name: 'Collector', expireSeconds: -1, scope: 'otlp-ingest' as const };

      act(() => result.current.openGenerator());
      act(() => result.current.updateDraft(draft));
      await act(async () => result.current.generate());

      expect(result.current.state.generationRecovery).toEqual({ phase: 'commit-uncertain', draft });
      expect(result.current.state.generatedToken).toBeNull();
      expect(refine.notification).not.toHaveBeenCalledWith({ message: 'token.generateFailed', type: 'error' });
      expect(refine.notification).toHaveBeenCalledWith({ message: 'token.unavailable', type: 'error' });

      await act(async () => result.current.generate());
      act(() => result.current.closeGenerator());
      act(() => result.current.openGenerator());
      expect(refine.custom).toHaveBeenCalledTimes(1);
      expect(result.current.state.draft).toEqual(draft);
    }
  );

  it('confirms revocation only after an authoritative list reread', async () => {
    refine.custom.mockResolvedValue({ data: { id: 7 } });
    refine.refetch.mockResolvedValue({ data: { data: [], total: 0 }, isError: false });
    const { result } = renderHook(() => useTokenResourceController());

    await act(async () => result.current.revoke(7));

    expect(refine.custom).toHaveBeenCalledWith({ url: tokenRevokeActionUrl(7), method: 'delete' });
    expect(refine.refetch).toHaveBeenCalledTimes(1);
    expect(refine.notification).toHaveBeenCalledWith({ message: 'token.revokeSuccess', type: 'success' });
  });

  it('admits only one revoke command when the same row is submitted twice in one tick', async () => {
    const revocation = deferred<{ data: { id: number } }>();
    refine.custom.mockReturnValue(revocation.promise);
    refine.refetch.mockResolvedValue({ data: { data: [], total: 0 }, isError: false });
    const { result } = renderHook(() => useTokenResourceController());

    let first: Promise<void>;
    let second: Promise<void>;
    act(() => {
      first = result.current.revoke(7);
      second = result.current.revoke(7);
    });

    expect(refine.custom).toHaveBeenCalledTimes(1);
    expect(result.current.state.revokingId).toBe(7);

    revocation.resolve({ data: { id: 7 } });
    await act(async () => Promise.all([first!, second!]));
  });

  it('does not overlap revocations whose completions could clear each other state', async () => {
    const revocation = deferred<{ data: { id: number } }>();
    refine.custom.mockReturnValue(revocation.promise);
    refine.refetch.mockResolvedValue({ data: { data: [], total: 0 }, isError: false });
    const { result } = renderHook(() => useTokenResourceController());

    let first: Promise<void>;
    act(() => {
      first = result.current.revoke(7);
    });
    act(() => {
      void result.current.revoke(8);
    });

    expect(refine.custom).toHaveBeenCalledTimes(1);
    expect(result.current.state.revokingId).toBe(7);

    revocation.resolve({ data: { id: 7 } });
    await act(async () => first!);
    expect(result.current.state.revokingId).toBeNull();
  });

  it('keeps revocation unconfirmed when the authoritative list still contains the id', async () => {
    refine.custom.mockResolvedValue({ data: { id: 7 } });
    const { result } = renderHook(() => useTokenResourceController());

    await act(async () => result.current.revoke(7));

    expect(refine.notification).not.toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'token.revokeSuccess'
      })
    );
    expect(refine.notification).toHaveBeenCalledWith({ message: 'token.unavailable', type: 'error' });
    expect(result.current.state.list.kind).toBe('unavailable');
  });

  it('keeps revocation in proof-only recovery when list totals contradict apparent absence', async () => {
    refine.custom.mockResolvedValue({ data: { id: 7 } });
    refine.refetch.mockResolvedValue({ data: { data: [], total: 1 }, isError: false });
    const { result } = renderHook(() => useTokenResourceController());

    await act(async () => result.current.revoke(7));

    expect(refine.custom).toHaveBeenCalledTimes(1);
    expect(refine.notification).not.toHaveBeenCalledWith({ message: 'token.revokeSuccess', type: 'success' });
    expect(refine.notification).toHaveBeenCalledWith({ message: 'token.unavailable', type: 'error' });
    expect(result.current.state.list.kind).toBe('unavailable');
  });

  it('keeps revocation unconfirmed when its authoritative reread fails', async () => {
    refine.custom.mockResolvedValue({ data: { id: 7 } });
    refine.refetch.mockRejectedValue(unavailableFailure());
    const { result } = renderHook(() => useTokenResourceController());

    await act(async () => result.current.revoke(7));

    expect(refine.notification).not.toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'token.revokeSuccess'
      })
    );
    expect(refine.notification).toHaveBeenCalledWith({ message: 'token.unavailable', type: 'error' });
    await waitFor(() => expect(result.current.state.list.kind).toBe('unavailable'));
  });

  it.each(ambiguousWriteFailures)(
    'proves an ambiguous %s revocation by exact absence without repeating DELETE',
    async (_label, failure) => {
      refine.custom.mockRejectedValueOnce(failure());
      refine.refetch.mockResolvedValue({ data: { data: [], total: 0 }, isError: false });
      const { result } = renderHook(() => useTokenResourceController());

      await act(async () => result.current.revoke(7));

      expect(refine.custom).toHaveBeenCalledTimes(1);
      expect(refine.refetch).toHaveBeenCalledTimes(1);
      expect(refine.notification).toHaveBeenCalledWith({ message: 'token.revokeSuccess', type: 'success' });
      expect(refine.notification).not.toHaveBeenCalledWith({ message: 'token.revokeFailed', type: 'error' });
    }
  );

  it.each(ambiguousWriteFailures)(
    'retains proof-only revocation recovery and never repeats an ambiguous %s DELETE',
    async (_label, failure) => {
      refine.custom.mockRejectedValueOnce(failure());
      refine.refetch
        .mockRejectedValueOnce(unavailableFailure())
        .mockResolvedValueOnce({ data: { data: [], total: 0 }, isError: false });
      const { result } = renderHook(() => useTokenResourceController());

      await act(async () => result.current.revoke(7));
      expect(result.current.state.list.kind).toBe('unavailable');
      expect(refine.notification).not.toHaveBeenCalledWith({ message: 'token.revokeFailed', type: 'error' });

      await act(async () => result.current.revoke(7));
      expect(refine.custom).toHaveBeenCalledTimes(1);
      await act(async () => result.current.retry());

      expect(refine.custom).toHaveBeenCalledTimes(1);
      expect(refine.refetch).toHaveBeenCalledTimes(2);
      expect(refine.notification).toHaveBeenCalledWith({ message: 'token.revokeSuccess', type: 'success' });
    }
  );

  it('releases generation and revocation after an explicit HTTP rejection', async () => {
    const rejected = httpRejectedFailure();
    refine.custom
      .mockRejectedValueOnce(rejected)
      .mockResolvedValueOnce({ data: { id: 'generated', token: 'hb_generated_once' } })
      .mockRejectedValueOnce(rejected)
      .mockResolvedValueOnce({ data: { id: 7 } });
    refine.refetch
      .mockResolvedValueOnce({ data: { data: [record], total: 1 }, isError: false })
      .mockResolvedValueOnce({ data: { data: [], total: 0 }, isError: false });
    const { result } = renderHook(() => useTokenResourceController());

    act(() => result.current.openGenerator());
    act(() => result.current.updateDraft({ name: 'Collector', expireSeconds: -1, scope: 'otlp-ingest' }));
    await act(async () => result.current.generate());
    await act(async () => result.current.generate());
    expect(result.current.state.generatedToken).toBe('hb_generated_once');

    await act(async () => result.current.revoke(7));
    await act(async () => result.current.revoke(7));
    expect(refine.custom).toHaveBeenCalledTimes(4);
  });

  it('reports a contract refresh as error without discarding the one-time receipt', async () => {
    refine.custom.mockResolvedValue({ data: { id: 'generated', token: 'hb_generated_once' } });
    refine.refetch.mockRejectedValue(invalidFailure());
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(fulfill => {
    resolve = fulfill;
  });
  return { promise, resolve };
}

const ambiguousWriteFailures = [
  ['network', unavailableFailure],
  ['5xx', unavailableFailure],
  ['malformed success', invalidFailure],
  ['business envelope', envelopeFailure]
] as const;

function unavailableFailure() {
  return new TokenRequestFailure('unavailable', 'uncertain');
}

function invalidFailure() {
  return new TokenRequestFailure('invalid', 'uncertain', { code: 'TOKEN_RESPONSE_INVALID' });
}

function httpRejectedFailure() {
  return new TokenRequestFailure('error', 'rejected');
}

function envelopeFailure() {
  return new TokenRequestFailure('error', 'uncertain');
}
