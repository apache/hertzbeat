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

import { describe, expect, it } from 'vitest';

import {
  buildAlertIntegrationPath,
  buildMonitorDetailPath,
  buildMonitorEditPath,
  buildMonitorListPath,
  type MonitorListRouteContext
} from './app-paths';

describe('application path builders', () => {
  it('builds Monitor list and detail targets from their canonical templates', () => {
    expect(buildMonitorListPath()).toBe('/monitors');
    expect(buildMonitorListPath({ app: 'website', labels: 'env:prod' })).toBe(
      '/monitors?app=website&labels=env%3Aprod'
    );
    expect(buildMonitorDetailPath(7)).toBe('/monitors/7');
    expect(buildMonitorEditPath(7)).toBe('/monitors/7/edit');
  });

  it('allows only public Monitor filters into the query target', () => {
    const context: MonitorListRouteContext & { token: string; credential: string } = {
      app: 'website',
      labels: 'env:prod',
      token: 'private-token',
      credential: 'private-credential'
    };

    const target = buildMonitorListPath(context);
    expect(target).toBe('/monitors?app=website&labels=env%3Aprod');
    expect(target).not.toContain('private-token');
    expect(target).not.toContain('private-credential');
  });

  it('builds the canonical external-alert integration path without query data', () => {
    expect(buildAlertIntegrationPath('prometheus')).toBe('/alerts/integrations/prometheus');
  });
});
