/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { BulletinQuery } from '../model/bulletin-model';
import { useBulletinPageCorrection } from './bulletin-page-correction-controller';
import { useBulletinQueryController } from './bulletin-query-controller';

const overflow = { content: [], totalElements: 16, totalPages: 2, number: 4, size: 15 };

describe('bulletin page correction controller', () => {
  it('replaces an authoritative overflow once and ignores retired or failed evidence', async () => {
    const replacePageIndex = vi.fn();
    const query = { search: 'ops', pageIndex: 4, pageSize: 15 };
    const initialProps: { currentQuery: BulletinQuery; page: typeof overflow | undefined } = {
      currentQuery: query,
      page: overflow
    };
    const hook = renderHook(
      ({ currentQuery, page }: { currentQuery: BulletinQuery; page: typeof overflow | undefined }) =>
        useBulletinPageCorrection(currentQuery, page, replacePageIndex),
      { initialProps }
    );

    await waitFor(() => expect(replacePageIndex).toHaveBeenCalledOnce());
    expect(replacePageIndex).toHaveBeenCalledWith(1);
    hook.rerender({ currentQuery: query, page: overflow });
    await act(() => Promise.resolve());
    expect(replacePageIndex).toHaveBeenCalledOnce();

    hook.rerender({ currentQuery: query, page: { ...overflow, number: 3 } });
    hook.rerender({ currentQuery: query, page: undefined });
    await act(() => Promise.resolve());
    expect(replacePageIndex).toHaveBeenCalledOnce();
  });

  it('preserves filters and replaces history through initial overflow, Back, and Forward', async () => {
    const hook = renderHook(useRouteHarness, { wrapper: routeWrapper });

    await waitFor(() => expect(hook.result.current.controller.query.pageIndex).toBe(1));
    expect(hook.result.current.location.search).toBe('?pageIndex=1&pageSize=15&search=ops');

    await act(async () => {
      await hook.result.current.navigate(-1);
    });
    expect(hook.result.current.location.pathname).toBe('/before');
    await act(async () => {
      await hook.result.current.navigate(1);
    });
    expect(hook.result.current.location.search).toBe('?pageIndex=1&pageSize=15&search=ops');
  });
});

function useRouteHarness() {
  const controller = useBulletinQueryController();
  const page =
    controller.query.pageIndex === 4
      ? overflow
      : { content: [{}], totalElements: 16, totalPages: 2, number: 1, size: 15 };
  useBulletinPageCorrection(controller.query, page, controller.replacePageIndex);
  return { controller, location: useLocation(), navigate: useNavigate() };
}

function routeWrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={['/before', '/bulletin?search=ops&pageIndex=4&pageSize=15']} initialIndex={1}>
      {children}
    </MemoryRouter>
  );
}
