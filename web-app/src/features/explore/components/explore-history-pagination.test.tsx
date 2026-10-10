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

import { App } from 'antd';
import type { TFunction } from 'i18next';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LogExploreQuery, TraceExploreQuery } from '../model/explore-query';
import { ExploreHistoryPagination } from './explore-history-pagination';

const t = ((key: string) => key) as TFunction;

describe('Explore history pagination', () => {
  afterEach(cleanup);

  it.each([
    { signal: 'logs' as const, query: scopedQuery('logs') },
    { signal: 'traces' as const, query: scopedQuery('traces') }
  ])('writes the canonical $signal page to the Explore URL', ({ signal, query }) => {
    const openPath = vi.fn();
    renderPagination(query, true, openPath);

    fireEvent.click(screen.getByTitle('2'));

    const path = openPath.mock.calls[0]?.[0] as string;
    const params = new URLSearchParams(path.slice(path.indexOf('?') + 1));
    expect(Object.fromEntries(params)).toMatchObject({
      signal,
      page: '1',
      start: '1000',
      end: '2000',
      timeZone: 'UTC',
      serviceName: 'checkout'
    });
  });

  it('disables pagination while retained evidence is stale', () => {
    const openPath = vi.fn();
    const view = renderPagination(scopedQuery('logs'), false, openPath);

    expect(view.container.querySelector('.ant-pagination-disabled')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('2'));
    expect(openPath).not.toHaveBeenCalled();
  });

  it('offers compact previous/next controls and leaves the visible current page to result status', () => {
    const openPath = vi.fn();
    renderPagination({ ...scopedQuery('logs'), pageIndex: 1 }, true, openPath, 'compact');

    const navigation = screen.getByRole('navigation', {
      name: 'explore.perses.pagination: explore.perses.pageStatus 2 / 2'
    });
    expect(navigation).toHaveAttribute('data-pagination-variant', 'compact');
    expect(screen.queryByText('2 / 2')).not.toBeInTheDocument();
    expect(screen.queryByTitle('1')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'explore.perses.previousPage' }));
    const params = new URLSearchParams(String(openPath.mock.calls[0]?.[0]).split('?')[1]);
    expect(params.has('page')).toBe(false);
    expect(screen.getByRole('button', { name: 'explore.perses.nextPage' })).toBeDisabled();
  });
});

function renderPagination(
  query: LogExploreQuery | TraceExploreQuery,
  enabled: boolean,
  openPath: (path: string) => void,
  variant: 'default' | 'compact' = 'default'
) {
  return render(
    <App>
      <ExploreHistoryPagination
        page={{ content: [], totalElements: 40, totalPages: 2, number: 0, size: 20 }}
        query={query}
        enabled={enabled}
        openPath={openPath}
        t={t}
        variant={variant}
      />
    </App>
  );
}

function scopedQuery(signal: 'logs'): LogExploreQuery;
function scopedQuery(signal: 'traces'): TraceExploreQuery;
function scopedQuery(signal: 'logs' | 'traces'): LogExploreQuery | TraceExploreQuery {
  return {
    signal,
    timeRange: 'last-30m',
    serviceName: 'checkout',
    start: 1_000,
    end: 2_000,
    timeZone: 'UTC'
  };
}
