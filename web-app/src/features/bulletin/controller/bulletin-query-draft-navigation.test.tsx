/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
