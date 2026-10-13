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

import { cleanup, render, screen } from '@testing-library/react';
import { Grid } from 'antd';
import type { TFunction } from 'i18next';
import { afterEach, expect, it, vi } from 'vitest';
import type { MetricInventoryViewModel } from '../model/explore-metric-inventory';
import { ExploreMetricCatalog } from './explore-metric-catalog';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it.each([false, true])('shows one ready count in the visible catalog heading with desktop=%s', desktop => {
  vi.spyOn(Grid, 'useBreakpoint').mockReturnValue({ md: desktop });
  const model: MetricInventoryViewModel = {
    search: '',
    setSearch: vi.fn(),
    retry: vi.fn(),
    state: 'ready',
    data: {
      context: {
        entityId: null,
        entityType: null,
        entityName: null,
        serviceName: null,
        serviceNamespace: null,
        environment: null,
        operationName: null,
        start: 100,
        end: 200
      },
      source: 'greptime-inventory',
      limit: 100,
      truncated: false,
      items: [
        { metricName: 'cpu', family: 'counter' },
        { metricName: 'memory', family: 'gauge' }
      ]
    }
  };
  const t = ((key: string, options?: { count?: number }) =>
    options?.count == null ? key : `${key}:${options.count}`) as TFunction;
  render(<ExploreMetricCatalog model={model} draftMetric="" committedMetric={undefined} select={vi.fn()} t={t} />);
  const count = screen.getByLabelText('exploreMetric.catalogCount:2');
  expect(count).toBeVisible();
  expect(count).toHaveTextContent('2');
  expect(count.closest(desktop ? 'h3' : 'summary')).not.toBeNull();
  expect(screen.getAllByText('2', { exact: true })).toHaveLength(1);
});
