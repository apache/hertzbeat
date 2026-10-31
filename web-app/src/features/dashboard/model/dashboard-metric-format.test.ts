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

import { describe, expect, it } from 'vitest';
import { dashboardMetricFormat } from './dashboard-metric-format';
describe('dashboard metric units', () => {
  it('uses one binary scale for the value, axis and tooltip, retaining exact bytes', () => {
    const format = dashboardMetricFormat('rss', 'By', [1048576, 2097152]);
    expect(format.format(1048576)).toBe('1 MiB');
    expect(format.format(2097152)).toBe('2 MiB');
    expect(format.exact(2097152)).toContain('2,097,152 B');
  });
  it('recognizes the verified collector metric when warehouse metadata omits the unit', () => {
    expect(dashboardMetricFormat('otelcol_process_memory_rss_bytes', undefined, [1048576]).format(1048576)).toBe(
      '1 MiB'
    );
  });
  it('does not infer bytes from arbitrary metric names or override declared metadata', () => {
    expect(dashboardMetricFormat('unknown_bytes', undefined, [1024]).format(1024)).toBe('1,024');
    expect(dashboardMetricFormat('otelcol_process_memory_rss_bytes', 'seconds', [1024]).format(1024)).toBe(
      '1,024 seconds'
    );
  });
  it('handles zero and negative byte values without a logarithm or sign error', () => {
    expect(dashboardMetricFormat('rss', 'bytes', [0]).format(0)).toBe('0 B');
    expect(dashboardMetricFormat('rss', 'bytes', [-1024]).format(-1024)).toBe('-1 KiB');
  });
});
