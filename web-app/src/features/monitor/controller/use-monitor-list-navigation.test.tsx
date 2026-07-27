/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import { describe, expect, it } from 'vitest';

import { useMonitorListNavigation } from './use-monitor-list-navigation';

const query = {
  search: '',
  app: 'website',
  status: '9',
  labels: '',
  sort: null,
  order: null,
  pageIndex: 0,
  pageSize: 10
} as const;

describe('useMonitorListNavigation permissions', () => {
  it('keeps guest direct create and edit inert while admitting view', () => {
    const view = renderHook(
      () => ({ navigation: useMonitorListNavigation(query, { canWrite: false }), location: useLocation() }),
      { wrapper }
    );

    act(() => view.result.current.navigation.create());
    expect(view.result.current.location.pathname).toBe('/monitors');
    act(() => view.result.current.navigation.open(7, 'edit'));
    expect(view.result.current.location.pathname).toBe('/monitors');
    act(() => view.result.current.navigation.open(7, 'view'));
    expect(view.result.current.location.pathname).toBe('/monitors/7');
  });
});

function wrapper({ children }: PropsWithChildren) {
  return <MemoryRouter initialEntries={['/monitors']}>{children}</MemoryRouter>;
}
