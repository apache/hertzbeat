/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';

import {
  clearCollectorControllerFixture,
  collector,
  load,
  navigateRoute,
  page,
  resetCollectorControllerFixture,
  useCollectorControllerTestHook,
  wrapper
} from './use-collector-controller-test-support';

beforeEach(() => {
  resetCollectorControllerFixture();
  load.mockResolvedValue(page(0, [collector('edge')], 40));
});
afterEach(() => {
  cleanup();
  clearCollectorControllerFixture();
});

it('retains the unsent collector name across paging without changing the committed query', async () => {
  const v = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors?name=old') });
  await waitFor(() => expect(v.result.current.listState.kind).toBe('ready'));
  act(() => v.result.current.actions.setNameDraft('pending'));
  act(() => v.result.current.actions.setPage(1, 8));
  expect(v.result.current.nameDraft).toBe('pending');
  expect(v.result.current.query.name).toBe('old');
  await act(() => navigateRoute?.(-1));
  expect(v.result.current.nameDraft).toBe('pending');
  await act(() => navigateRoute?.(1));
  expect(v.result.current.nameDraft).toBe('pending');
  act(() => v.result.current.actions.setNameDraft('  next  '));
  act(() => v.result.current.actions.submitName());
  expect(v.result.current.nameDraft).toBe('next');
  await act(() => navigateRoute?.(-1));
  expect(v.result.current.nameDraft).toBe('old');
  await act(() => navigateRoute?.(1));
  expect(v.result.current.nameDraft).toBe('next');
  act(() => v.result.current.actions.setNameDraft('  next  '));
  act(() => v.result.current.actions.submitName());
  expect(v.result.current.nameDraft).toBe('next');
  v.unmount();
  const remount = renderHook(useCollectorControllerTestHook, { wrapper: wrapper('/settings/collectors?name=next') });
  expect(remount.result.current.nameDraft).toBe('next');
});
