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

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExploreMetricResult } from './explore-metric-result';
import { parseExploreQuery } from '../model/explore-model';

vi.mock('../components/metric-result', () => ({
  MetricResult: ({ onOpenLogs }: { onOpenLogs?: () => void }) => (
    <button disabled={!onOpenLogs} onClick={onOpenLogs}>
      Logs
    </button>
  )
}));
afterEach(cleanup);

describe('Metric evidence continuation', () => {
  it('opens service logs at the observed window while removing the metric expression', () => {
    const openPath = vi.fn();
    render(
      <ExploreMetricResult
        query={{
          signal: 'metrics',
          timeRange: 'last-30m',
          serviceName: 'checkout',
          serviceNamespace: 'shop',
          environment: 'prod',
          query: 'cpu'
        }}
        result={{ kind: 'metric', state: { kind: 'empty' }, window: { from: 1000, to: 2000 }, revision: 0 }}
        retry={vi.fn()}
        openPath={openPath}
        evidenceCurrent
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Logs' }));
    const path = openPath.mock.calls[0]![0] as string;
    expect(parseExploreQuery(new URLSearchParams(path.split('?')[1]))).toMatchObject({
      signal: 'logs',
      serviceName: 'checkout',
      serviceNamespace: 'shop',
      environment: 'prod',
      start: 1000,
      end: 2000,
      query: undefined
    });
  });

  it.each([false, true])('does not offer a scope-free or stale log continuation (current: %s)', evidenceCurrent => {
    render(
      <ExploreMetricResult
        query={{ signal: 'metrics', timeRange: 'last-30m', ...(evidenceCurrent ? {} : { serviceName: 'checkout' }) }}
        result={{ kind: 'metric', state: { kind: 'empty' }, window: { from: 1000, to: 2000 }, revision: 0 }}
        retry={vi.fn()}
        openPath={vi.fn()}
        evidenceCurrent={evidenceCurrent}
      />
    );
    expect(screen.getByRole('button', { name: 'Logs' })).toBeDisabled();
  });
});
