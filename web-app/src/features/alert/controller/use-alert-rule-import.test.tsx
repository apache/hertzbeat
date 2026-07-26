/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ importAlertRuleDefinitions: vi.fn() }));
const notify = vi.hoisted(() => ({ success: vi.fn(), warning: vi.fn() }));
vi.mock('../api/alert-rule-import-api', () => ({
  AlertRuleImportError: class AlertRuleImportError extends Error {
    constructor(
      readonly kind: string,
      readonly outcome: string
    ) {
      super('failed');
    }
  },
  ...api
}));
vi.mock('antd', async importOriginal => ({
  ...(await importOriginal<typeof import('antd')>()),
  App: { useApp: () => ({ message: notify }) }
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { AlertRuleImportError } from '../api/alert-rule-import-api';
import { useAlertRuleImport } from './use-alert-rule-import';

describe('Alert Rule import controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.importAlertRuleDefinitions.mockResolvedValue(undefined);
  });

  it('keeps file selection explicit, imports once, closes, and rereads', async () => {
    const reread = vi.fn().mockResolvedValue(undefined);
    const view = renderHook(() => useAlertRuleImport(reread));
    const file = new File(['[]'], 'rules.json');

    act(() => view.result.current.actions.open());
    act(() => view.result.current.actions.selectFile(file));
    await act(() => view.result.current.actions.submit());

    expect(api.importAlertRuleDefinitions).toHaveBeenCalledWith(file, expect.any(AbortSignal));
    expect(reread).toHaveBeenCalledOnce();
    expect(notify.success).toHaveBeenCalledWith('alertRules.import.success');
    expect(view.result.current.state.draft).toBeNull();
  });

  it('cancels an unsubmitted selection without writing', () => {
    const view = renderHook(() => useAlertRuleImport(vi.fn()));
    act(() => view.result.current.actions.open());
    act(() => view.result.current.actions.selectFile(new File(['[]'], 'rules.json')));
    act(() => view.result.current.actions.cancel());

    expect(view.result.current.state.draft).toBeNull();
    expect(api.importAlertRuleDefinitions).not.toHaveBeenCalled();
  });

  it('does not repeat an uncertain import until a canonical reread succeeds', async () => {
    const reread = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);
    api.importAlertRuleDefinitions.mockRejectedValueOnce(new AlertRuleImportError('unavailable', 'uncertain'));
    const view = renderHook(() => useAlertRuleImport(reread));
    const file = new File(['[]'], 'rules.json');

    act(() => view.result.current.actions.open());
    act(() => view.result.current.actions.selectFile(file));
    await act(() => view.result.current.actions.submit());
    expect(view.result.current.state.inspectionRequired).toBe(true);

    await act(() => view.result.current.actions.submit());
    expect(api.importAlertRuleDefinitions).toHaveBeenCalledTimes(1);

    await act(() => view.result.current.actions.inspect());
    expect(view.result.current.state.inspectionRequired).toBe(true);
    await act(() => view.result.current.actions.inspect());
    expect(view.result.current.state.inspectionRequired).toBe(false);
    expect(view.result.current.state.draft).toBeNull();

    act(() => view.result.current.actions.open());
    act(() => view.result.current.actions.selectFile(file));
    await act(() => view.result.current.actions.submit());
    expect(api.importAlertRuleDefinitions).toHaveBeenCalledTimes(2);
  });

  it('allows correction and explicit retry after a definite rejection', async () => {
    api.importAlertRuleDefinitions.mockRejectedValueOnce(new AlertRuleImportError('validation', 'rejected'));
    const view = renderHook(() => useAlertRuleImport(vi.fn().mockResolvedValue(undefined)));
    const file = new File(['[]'], 'rules.json');

    act(() => view.result.current.actions.open());
    act(() => view.result.current.actions.selectFile(file));
    await act(() => view.result.current.actions.submit());
    expect(view.result.current.state.failure).toEqual({ kind: 'validation', outcome: 'rejected' });

    act(() => view.result.current.actions.selectFile(file));
    await act(() => view.result.current.actions.submit());
    expect(api.importAlertRuleDefinitions).toHaveBeenCalledTimes(2);
    expect(view.result.current.state.draft).toBeNull();
  });

  it('admits only one import while React is still publishing busy state', async () => {
    api.importAlertRuleDefinitions.mockImplementation(() => new Promise(() => undefined));
    const view = renderHook(() => useAlertRuleImport(vi.fn()));
    const file = new File(['[]'], 'rules.json');

    act(() => view.result.current.actions.open());
    act(() => view.result.current.actions.selectFile(file));
    act(() => {
      void view.result.current.actions.submit();
      void view.result.current.actions.submit();
    });

    expect(api.importAlertRuleDefinitions).toHaveBeenCalledTimes(1);
  });

  it('aborts the active import and never rereads after ownership unmounts', async () => {
    let signal: AbortSignal | undefined;
    api.importAlertRuleDefinitions.mockImplementation((_file: File, currentSignal: AbortSignal) => {
      signal = currentSignal;
      return new Promise(() => undefined);
    });
    const reread = vi.fn();
    const view = renderHook(() => useAlertRuleImport(reread));

    act(() => view.result.current.actions.open());
    act(() => view.result.current.actions.selectFile(new File(['[]'], 'rules.json')));
    act(() => void view.result.current.actions.submit());
    expect(signal).toBeInstanceOf(AbortSignal);

    view.unmount();

    expect(signal?.aborted).toBe(true);
    expect(reread).not.toHaveBeenCalled();
  });

  it('keeps a successful import closed when the supplemental reread fails', async () => {
    const reread = vi.fn().mockRejectedValue(new Error('offline'));
    const view = renderHook(() => useAlertRuleImport(reread));

    act(() => view.result.current.actions.open());
    act(() => view.result.current.actions.selectFile(new File(['[]'], 'rules.json')));
    await act(() => view.result.current.actions.submit());

    expect(view.result.current.state.draft).toBeNull();
    expect(notify.warning).toHaveBeenCalledWith('alertRules.import.refreshFailure');
  });
});
