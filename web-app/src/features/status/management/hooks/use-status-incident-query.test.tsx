/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { useStatusIncidentQuery } from './use-status-incident-query';

describe('useStatusIncidentQuery', () => {
  it('syncs drafts on history search changes without erasing them for pagination-only changes', async () => {
    const { result } = renderQueryHook([
      '/settings/status-page?search=previous&pageIndex=4&pageSize=20',
      '/settings/status-page?search=current&pageIndex=2&pageSize=20'
    ], 1);

    act(() => result.current.setDraftSearch('unsubmitted draft'));
    act(() => result.current.changePage(3, 20));
    expect(result.current.query).toEqual({ search: 'current', pageIndex: 3, pageSize: 20 });
    expect(result.current.draftSearch).toBe('unsubmitted draft');

    act(() => { void result.current.navigate(-1); });
    await waitFor(() => expect(result.current.query.pageIndex).toBe(2));
    expect(result.current.draftSearch).toBe('unsubmitted draft');

    act(() => { void result.current.navigate(-1); });
    await waitFor(() => expect(result.current.query.search).toBe('previous'));
    expect(result.current.draftSearch).toBe('previous');

    act(() => { void result.current.navigate(1); });
    await waitFor(() => expect(result.current.query.search).toBe('current'));
    expect(result.current.draftSearch).toBe('current');
  });

  it('trims submitted search and applies explicit pagination reset rules', async () => {
    const { result } = renderQueryHook([
      '/settings/status-page?search=old&pageIndex=5&pageSize=20'
    ]);

    act(() => result.current.setDraftSearch('  next outage  '));
    act(() => result.current.submit());
    await waitFor(() => expect(result.current.query)
      .toEqual({ search: 'next outage', pageIndex: 0, pageSize: 20 }));

    act(() => result.current.changePage(4, 20));
    await waitFor(() => expect(result.current.query.pageIndex).toBe(4));
    act(() => result.current.changePage(9, 50));
    await waitFor(() => expect(result.current.query)
      .toEqual({ search: 'next outage', pageIndex: 0, pageSize: 50 }));
    expect(result.current.location.search).toBe('?search=next+outage&pageIndex=0&pageSize=50');
  });

  it('normalizes the draft even when submit keeps the same committed search', () => {
    const { result } = renderQueryHook([
      '/settings/status-page?search=outage&pageIndex=3&pageSize=20'
    ]);

    act(() => result.current.setDraftSearch('  outage  '));
    act(() => result.current.submit());

    expect(result.current.query).toEqual({ search: 'outage', pageIndex: 0, pageSize: 20 });
    expect(result.current.draftSearch).toBe('outage');
  });
});

function renderQueryHook(initialEntries: string[], initialIndex = 0) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>{children}</MemoryRouter>
  );
  return renderHook(() => ({
    ...useStatusIncidentQuery(),
    location: useLocation(),
    navigate: useNavigate()
  }), { wrapper });
}
