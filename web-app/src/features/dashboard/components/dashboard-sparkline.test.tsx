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
import { afterEach, describe, expect, it } from 'vitest';
import { DashboardSparkline } from './dashboard-sparkline';
afterEach(cleanup);
describe('dashboard chart time evidence', () => {
  it('labels the actual query window even when samples cover only its middle', () => {
    const start = Date.UTC(2026, 9, 14, 0, 0),
      end = start + 900000;
    render(
      <DashboardSparkline
        start={start}
        end={end}
        points={[
          [start + 300000, 12],
          [start + 600000, 16]
        ]}
        label="trend"
      />
    );
    const time = (value: number) =>
      new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    expect(screen.getByText(time(start))).toBeVisible();
    expect(screen.getByText(time(end))).toBeVisible();
    expect(screen.getByRole('img', { name: 'trend' }).querySelector('circle title')?.textContent).toContain(
      new Date(start + 300000).toLocaleTimeString()
    );
  });
  it('keeps exact point values in hover evidence while using the supplied display format', () => {
    render(
      <DashboardSparkline
        start={1000}
        end={2000}
        points={[[1500, 1048576]]}
        label="memory"
        formatValue={() => '1 MiB'}
        exactValue={() => '1 MiB (1,048,576 B)'}
      />
    );
    expect(screen.getByRole('img', { name: 'memory' }).querySelector('circle title')?.textContent).toContain(
      '1 MiB (1,048,576 B)'
    );
  });
  it('does not fabricate a visible bar for a zero-count bucket', () => {
    render(
      <DashboardSparkline
        variant="bars"
        start={1000}
        end={2000}
        points={[
          [1000, 0],
          [1500, 20]
        ]}
        label="logs"
      />
    );
    const bars = screen.getByRole('img', { name: 'logs' }).querySelectorAll('rect');
    expect(bars[0]?.getAttribute('height')).toBe('0');
    expect(Number(bars[1]?.getAttribute('height'))).toBeGreaterThan(0);
  });
});
