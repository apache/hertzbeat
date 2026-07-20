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

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { useLabelQueryController } from './label-query-controller';

describe('Label query controller', () => {
  afterEach(cleanup);

  it('canonicalizes a direct URL and discards unrelated or sensitive parameters', async () => {
    renderProbe('/settings/labels?search=%20env%20&pageIndex=-1&pageSize=999&token=private-token');

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/settings/labels?pageIndex=0&pageSize=20&search=env')
    );
    expect(screen.getByTestId('query')).toHaveTextContent('env|0|20');
    expect(screen.getByTestId('location')).not.toHaveTextContent('private-token');
  });

  it('resets pagination on changed search and converges across Back and Forward', async () => {
    renderProbe('/settings/labels?pageIndex=2&pageSize=50&search=env');
    await waitFor(() => expect(screen.getByTestId('query')).toHaveTextContent('env|2|50'));

    fireEvent.click(screen.getByRole('button', { name: 'Search production' }));
    await waitFor(() => expect(screen.getByTestId('query')).toHaveTextContent('production|0|50'));
    fireEvent.click(screen.getByRole('button', { name: 'Open page four' }));
    await waitFor(() => expect(screen.getByTestId('query')).toHaveTextContent('production|3|100'));

    act(() => screen.getByRole('button', { name: 'Back' }).click());
    await waitFor(() => expect(screen.getByTestId('query')).toHaveTextContent('production|0|50'));
    act(() => screen.getByRole('button', { name: 'Forward' }).click());
    await waitFor(() => expect(screen.getByTestId('query')).toHaveTextContent('production|3|100'));
  });

  it('keeps query and command references stable across an unrelated rerender', () => {
    const snapshots: ControllerSnapshot[] = [];
    renderProbe('/settings/labels?pageIndex=0&pageSize=20&search=env', snapshot => snapshots.push(snapshot));

    const initial = snapshots.at(-1);
    expect(initial).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Rerender' }));
    const rerendered = snapshots.at(-1);
    expect(rerendered?.query).toBe(initial?.query);
    expect(rerendered?.reconcileConfirmedDelete).toBe(initial?.reconcileConfirmedDelete);
    expect(rerendered?.setPage).toBe(initial?.setPage);
    expect(rerendered?.setSearch).toBe(initial?.setSearch);
  });

  it('replaces an unchanged sole-record last page exactly once while preserving filter and page size', async () => {
    renderProbe('/settings/labels?pageIndex=2&pageSize=50&search=env');

    fireEvent.click(screen.getByRole('button', { name: 'Confirm sole record deletion from page three' }));
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/settings/labels?pageIndex=1&pageSize=50&search=env')
    );
    expect(screen.getByTestId('navigation-type')).toHaveTextContent('REPLACE');

    fireEvent.click(screen.getByRole('button', { name: 'Confirm sole record deletion from page three' }));
    expect(screen.getByTestId('query')).toHaveTextContent('env|1|50');
  });

  it('does not let an old delete completion move a newer query scope', async () => {
    renderProbe('/settings/labels?pageIndex=2&pageSize=50&search=env');

    fireEvent.click(screen.getByRole('button', { name: 'Search production' }));
    await waitFor(() => expect(screen.getByTestId('query')).toHaveTextContent('production|0|50'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm sole record deletion from page three' }));

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/settings/labels?pageIndex=0&pageSize=50&search=production'
    );
  });

  it('publishes an externally navigated query before a deferred old delete settles', async () => {
    renderProbe('/settings/labels?pageIndex=2&pageSize=50&search=env');

    fireEvent.click(screen.getByRole('button', { name: 'Navigate externally and settle deferred delete' }));

    await waitFor(() => expect(screen.getByTestId('query')).toHaveTextContent('production|4|100'));
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/settings/labels?pageIndex=4&pageSize=100&search=production'
    );
  });
});

type ControllerSnapshot = ReturnType<typeof useLabelQueryController>;

function renderProbe(initialEntry: string, onSnapshot?: (snapshot: ControllerSnapshot) => void) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryProbe onSnapshot={onSnapshot} />
    </MemoryRouter>
  );
}

function QueryProbe({ onSnapshot }: { onSnapshot: ((snapshot: ControllerSnapshot) => void) | undefined }) {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const controller = useLabelQueryController();
  const { query, reconcileConfirmedDelete, setPage, setSearch } = controller;
  const deferredDeleteReceipt = useRef<Parameters<typeof reconcileConfirmedDelete>[0] | null>(null);
  const [, rerender] = useState(0);
  useLayoutEffect(() => {
    if (query.search !== 'production' || !deferredDeleteReceipt.current) return;
    const receipt = deferredDeleteReceipt.current;
    deferredDeleteReceipt.current = null;
    reconcileConfirmedDelete(receipt);
  }, [query.search, reconcileConfirmedDelete]);
  useEffect(() => {
    onSnapshot?.(controller);
  });
  return (
    <>
      <output data-testid="location">{`${location.pathname}${location.search}`}</output>
      <output data-testid="query">{`${query.search}|${query.pageIndex}|${query.pageSize}`}</output>
      <output data-testid="navigation-type">{navigationType}</output>
      <button type="button" onClick={() => setSearch(' production ')}>
        Search production
      </button>
      <button type="button" onClick={() => setPage(3, 100)}>
        Open page four
      </button>
      <button
        type="button"
        onClick={() => {
          deferredDeleteReceipt.current = {
            query: { search: 'env', pageIndex: 2, pageSize: 50 },
            visibleRecords: 1
          };
          void navigate('/settings/labels?pageIndex=4&pageSize=100&search=production');
        }}
      >
        Navigate externally and settle deferred delete
      </button>
      <button
        type="button"
        onClick={() =>
          reconcileConfirmedDelete({
            query: { search: 'env', pageIndex: 2, pageSize: 50 },
            visibleRecords: 1
          })
        }
      >
        Confirm sole record deletion from page three
      </button>
      <button type="button" onClick={() => void navigate(-1)}>
        Back
      </button>
      <button type="button" onClick={() => void navigate(1)}>
        Forward
      </button>
      <button type="button" onClick={() => rerender(value => value + 1)}>
        Rerender
      </button>
    </>
  );
}
