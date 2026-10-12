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

import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, it, expect } from 'vitest';
import type { TFunction } from 'i18next';
import { LogThroughputBucket } from './explore-log-throughput-bucket';
const t = ((key: string, args?: { count?: number; seconds?: number }) =>
  `${key}${args?.count !== undefined ? ` ${args.count}` : ''}${args?.seconds !== undefined ? ` ${args.seconds}` : ''}`) as TFunction;
afterEach(cleanup);
it('keeps raw logs, numeric sample count and SUM rates distinct, including missing samples', () => {
  render(
    <LogThroughputBucket
      timestamp={1000}
      intervalMs={1000}
      window={{ start: 1500, end: 2000 }}
      t={t}
      items={[
        { label: 'measured', count: 9, measurement: { state: 'ready', sampleCount: 4, value: 120 } },
        { label: 'missing', count: 3, measurement: { state: 'no_samples', sampleCount: 0, value: null } }
      ]}
    />
  );
  expect(screen.getByText('explore.logAnalysis.count: 9')).toBeVisible();
  expect(screen.getByText(/explore.logAnalysis.sampleCount 4/)).toBeVisible();
  expect(screen.getByText('explore.logAnalysis.throughput: 120 explore.logAnalysis.throughputValueUnit')).toBeVisible();
  expect(screen.getAllByText('explore.logAnalysis.no_samples')).toHaveLength(2);
  expect(screen.getByRole('region', { name: 'explore.logAnalysis.rawBucket' })).toHaveAttribute('tabindex', '0');
});
it('shows normalization overflow as unavailable and never rounds small nonzero rates to zero', () => {
  const props = { timestamp: 1000, window: { start: 1000, end: 1001 }, t };
  const view = render(
    <LogThroughputBucket
      {...props}
      intervalMs={1}
      items={[
        { label: 'overflow', count: 1, measurement: { state: 'ready', sampleCount: 1, value: Number.MAX_VALUE } }
      ]}
    />
  );
  expect(screen.getByText(/explore.logAnalysis.throughput: explore.logAnalysis.non_finite/)).toBeVisible();
  view.rerender(<LogThroughputBucket {...props} intervalMs={86400000} items={[{ label: 'small', count: 1 }]} />);
  expect(
    screen.getByText('explore.logAnalysis.throughput: 1.15741E-5 explore.logAnalysis.throughputLogsUnit')
  ).toBeVisible();
  view.rerender(
    <LogThroughputBucket
      {...props}
      intervalMs={86400000}
      items={[
        { label: 'negative', count: 1, measurement: { state: 'ready', sampleCount: 1, value: -1 } },
        { label: 'zero', count: 0 }
      ]}
    />
  );
  expect(
    screen.getByText('explore.logAnalysis.throughput: -1.15741E-5 explore.logAnalysis.throughputValueUnit')
  ).toBeVisible();
  expect(screen.getByText('explore.logAnalysis.throughput: 0 explore.logAnalysis.throughputLogsUnit')).toBeVisible();
});
