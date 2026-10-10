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
import type { TFunction } from 'i18next';
import { afterEach, expect, it } from 'vitest';
import { MetricSeriesSummary } from './metric-series-summary';
afterEach(cleanup);
it('visibly identifies same-name series by number and labels', () => {
  render(
    <MetricSeriesSummary
      t={((key: string) => key) as TFunction}
      series={['a', 'b'].map(host => ({
        key: host,
        name: 'cpu',
        labels: { __name__: 'cpu', host },
        points: [[100, 1]]
      }))}
    />
  );
  expect(screen.getByRole('rowheader', { name: '#1 cpu host=a' })).toBeVisible();
  expect(screen.getByRole('rowheader', { name: '#2 cpu host=b' })).toBeVisible();
  expect(screen.queryByText('__name__=cpu')).not.toBeInTheDocument();
});

it('shares each exact metric and unit once while keeping changing labels and full names accessible', () => {
  const name = 'remote_models_fetch_update_duration_ms_milliseconds_bucket';
  render(
    <MetricSeriesSummary
      t={((key: string) => key) as TFunction}
      series={[
        ...['0', '10', '+Inf'].map((le, index) => ({
          key: String(index),
          name,
          unit: 'ms',
          labels: { __name__: name, host: 'worker', le },
          points: [[100, index]]
        })),
        { key: 'other', name: 'memory_bytes', unit: 'bytes', labels: { host: 'worker' }, points: [[100, 42]] }
      ]}
    />
  );
  expect(screen.getAllByText(name, { exact: true })).toHaveLength(1);
  expect(screen.getAllByText('memory_bytes', { exact: true })).toHaveLength(1);
  expect(screen.getByRole('rowheader', { name: '#1 ' + name + ' host=worker · le=0' })).toBeVisible();
  expect(screen.getByText('le=+Inf', { exact: true })).toBeVisible();
});

it('does not combine the same metric across different units', () => {
  render(
    <MetricSeriesSummary
      t={((key: string) => key) as TFunction}
      series={[
        { key: 'ms', name: 'duration', unit: 'ms', labels: { host: 'a' }, points: [[100, 1]] },
        { key: 's', name: 'duration', unit: 's', labels: { host: 'a' }, points: [[100, 2]] }
      ]}
    />
  );
  expect(screen.getAllByText('duration', { exact: true })).toHaveLength(2);
  expect(screen.getAllByRole('rowgroup')).toHaveLength(3);
  expect(screen.getByRole('rowheader', { name: '#1 duration host=a' })).toBeVisible();
  expect(screen.getByRole('rowheader', { name: '#2 duration host=a' })).toBeVisible();
});

it.each(['constructor', 'toString', 'hasOwnProperty'])('keeps differing own %s labels visible', key => {
  render(
    <MetricSeriesSummary
      t={((value: string) => value) as TFunction}
      series={['worker-a', 'worker-b'].map(value => ({
        key: value,
        name: 'cpu',
        labels: { host: 'fixture', [key]: value },
        points: [[100, 1]]
      }))}
    />
  );
  expect(screen.getByText(`${key}=worker-a`, { exact: true })).toBeVisible();
  expect(screen.getByText(`${key}=worker-b`, { exact: true })).toBeVisible();
  expect(screen.getAllByText('host=fixture', { exact: true })).toHaveLength(1);
});

it.each(['constructor', 'toString', 'hasOwnProperty'])('keeps a %s label owned by only one series visible', key => {
  render(
    <MetricSeriesSummary
      t={((value: string) => value) as TFunction}
      series={[
        { key: 'a', name: 'cpu', labels: { host: 'fixture', [key]: 'worker-a' }, points: [[100, 1]] },
        { key: 'b', name: 'cpu', labels: { host: 'fixture' }, points: [[100, 2]] }
      ]}
    />
  );
  expect(screen.getByText(`${key}=worker-a`, { exact: true })).toBeVisible();
});
