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

import {
  buildSignalDashboardPath,
  canonicalSignalDashboardPath,
  safeDashboardExploreReturnPath
} from './signal-dashboard-paths';

describe('signal Dashboard navigation', () => {
  it('bounds an Explore source return without interpreting or dropping query conditions', () => {
    const path = '/explore?signal=logs&start=1000&end=2000&timeZone=UTC&query=failed+request&serviceName=api';
    expect(safeDashboardExploreReturnPath(path)).toBe(path);
    expect(safeDashboardExploreReturnPath('/explore?signal=logs')).toBeUndefined();
    expect(safeDashboardExploreReturnPath(path.replace('signal=logs', 'signal=other'))).toBeUndefined();
    expect(safeDashboardExploreReturnPath('https://outside.test' + path)).toBeUndefined();
  });
  it('builds directory and existing shared-key paths', () => {
    expect(buildSignalDashboardPath()).toBe('/observability/dashboards');
    expect(buildSignalDashboardPath('legacy:dashboard')).toBe('/observability/dashboards?dashboard=legacy%3Adashboard');
    expect(() => buildSignalDashboardPath('../outside')).toThrow();
  });

  it('retains exact time and explicit empty variable overrides without normalization', () => {
    const path =
      '/observability/dashboards?dashboard=ops&start=1000&end=2000&timeZone=UTC&varServiceName=api&varServiceNamespace=&varEnvironment=production';
    expect(canonicalSignalDashboardPath(path)).toBe(path);
    expect(canonicalSignalDashboardPath('/observability/dashboards?dashboard=ops&duration=30m')).toBe(
      '/observability/dashboards?dashboard=ops&duration=30m'
    );
  });

  it.each([
    'https://other.test/observability/dashboards?dashboard=ops',
    '//other.test/observability/dashboards',
    '/observability/dashboards/other?dashboard=ops',
    '/observability/dashboards?dashboard=ops#fragment',
    '/observability/dashboards?dashboard=ops&dashboard=other',
    '/observability/dashboards?dashboard=ops&unknown=value',
    '/observability/dashboards?dashboard=ops&start=1000',
    '/observability/dashboards?dashboard=ops&start=2000&end=1000',
    '/observability/dashboards?dashboard=ops&start=1&end=86400002',
    '/observability/dashboards?dashboard=ops&start=1000&end=2000&duration=30m',
    '/observability/dashboards?dashboard=ops&duration=7d',
    '/observability/dashboards?dashboard=ops&timeZone=Not%2FAZone',
    '/observability/dashboards?dashboard=ops&varServiceName=%20api',
    '/observability/dashboards?dashboard=ops&varEnvironment=%24%7Benvironment%7D'
  ])('rejects invalid or unrepresentable return target %s', path => {
    expect(canonicalSignalDashboardPath(path)).toBeUndefined();
  });
});
