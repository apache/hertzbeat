/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { act, cleanup, render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { useBulletinQueryController } from './bulletin-query-controller';

type DraftProbe = {
  draft: string;
  committed: string;
  type: (value: string) => void;
  page: () => void;
  submit: () => void;
};

const cases: { route: string; field: string; useController: () => DraftProbe }[] = [
  {
    route: '/bulletin',
    field: 'search',
    useController: () => {
      const c = useBulletinQueryController();
      return {
        draft: c.search,
        committed: c.query.search,
        type: c.setSearch,
        page: () => c.changePage(2, 8),
        submit: c.submitSearch
      };
    }
  }
];

afterEach(cleanup);

describe.each(cases)('$route unsent query draft', ({ route, field, useController }) => {
  function mount() {
    let current!: DraftProbe;
    function Probe() {
      current = useController();
      return null;
    }
    const router = createMemoryRouter(
      [
        { path: route, element: <Probe /> },
        { path: '/away', element: null }
      ],
      { initialEntries: [`${route}?${field}=old&pageIndex=0&pageSize=8`] }
    );
    render(<RouterProvider router={router} />);
    return { router, current: () => current };
  }

  it('keeps unsent text through pagination and history without committing it', async () => {
    const view = mount();
    act(() => view.current().type('pending'));
    act(() => view.current().page());
    expect(view.current().committed).toBe('old');
    expect(view.current().draft).toBe('pending');
    expect(new URLSearchParams(view.router.state.location.search).get(field)).toBe('old');
    await act(() => view.router.navigate(-1));
    expect(view.current().draft).toBe('pending');
    await act(() => view.router.navigate(1));
    expect(view.current().draft).toBe('pending');
  });

  it('submits trimmed text, converges changed searches on history, and normalizes same-value submits', async () => {
    const view = mount();
    act(() => view.current().type('  next  '));
    act(() => view.current().submit());
    expect(view.current().committed).toBe('next');
    expect(view.current().draft).toBe('next');
    await act(() => view.router.navigate(-1));
    expect(view.current().draft).toBe('old');
    await act(() => view.router.navigate(1));
    expect(view.current().draft).toBe('next');
    act(() => view.current().type('  next  '));
    act(() => view.current().submit());
    expect(view.current().draft).toBe('next');
  });

  it('discards unsent text on actual route unmount and remount', async () => {
    const view = mount();
    act(() => view.current().type('pending'));
    await act(() => view.router.navigate('/away'));
    await act(() => view.router.navigate(-1));
    expect(view.current().committed).toBe('old');
    expect(view.current().draft).toBe('old');
  });
});
