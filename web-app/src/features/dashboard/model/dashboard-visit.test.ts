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
import { dashboardVisitKey, readDashboardVisit, writeDashboardVisit } from './dashboard-visit';
const now = 1_700_000_000_000;

describe('dashboard visit boundary', () => {
  it('round-trips the exact window and normalized public scope', () => {
    const value = readDashboardVisit(
      JSON.stringify({ version: 1, serviceName: ' checkout ', environment: ' local ', end: now - 10000 }),
      now
    );
    expect(value).toEqual({ serviceName: 'checkout', environment: 'local', end: now - 10000 });
    expect(readDashboardVisit(writeDashboardVisit(value), now)).toEqual(value);
  });
  it.each(['{broken', '{}', 'null', '[]', '{"version":2}'])('resets invalid storage %s', raw => {
    expect(readDashboardVisit(raw, now)).toEqual({ serviceName: '', environment: '', end: now });
  });
  it('removes invalid filters independently and rejects a future or unsafe time anchor', () => {
    expect(
      readDashboardVisit(
        JSON.stringify({ version: 1, serviceName: 'x'.repeat(257), environment: 'local', end: now + 1 }),
        now
      )
    ).toEqual({ serviceName: '', environment: 'local', end: now });
    expect(
      readDashboardVisit(
        JSON.stringify({
          version: 1,
          serviceName: 'checkout',
          environment: 'bad\u0000env',
          end: Number.MAX_SAFE_INTEGER + 1
        }),
        now
      )
    ).toEqual({ serviceName: 'checkout', environment: '', end: now });
  });
  it('requires an authenticated identity and separates both users and workspaces', () => {
    expect(dashboardVisitKey({ authenticated: false, workspaceId: 'one', username: 'alice' })).toBeUndefined();
    const one = dashboardVisitKey({ authenticated: true, workspaceId: 'one', username: 'alice' });
    expect(one).not.toBe(dashboardVisitKey({ authenticated: true, workspaceId: 'one', username: 'bob' }));
    expect(one).not.toBe(dashboardVisitKey({ authenticated: true, workspaceId: 'two', username: 'alice' }));
  });
});
