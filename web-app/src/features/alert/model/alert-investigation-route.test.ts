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

import { buildAlertInvestigationPath, readAlertInvestigationRoute } from './alert-investigation-route';

describe('Alert investigation route', () => {
  it('builds a shareable exact window from persisted activeAt and a safe Alert Center return path', () => {
    expect(
      buildAlertInvestigationPath(
        { id: 11, activeAt: 1_784_250_060_000, startAt: 1_784_250_000_000 },
        'Asia/Shanghai',
        '/alerts?status=firing&password=private'
      )
    ).toBe(
      '/alerts/11/investigate?start=1784249160000&end=1784250960000&timeZone=Asia%2FShanghai&returnTo=%2Falerts%3Fstatus%3Dfiring'
    );
  });

  it('falls back to persisted startAt but never invents an anchor', () => {
    expect(
      buildAlertInvestigationPath({ id: 11, activeAt: null, startAt: 1_784_250_000_000 }, 'UTC', '/alerts')
    ).toContain('start=1784249100000&end=1784250900000');
    expect(buildAlertInvestigationPath({ id: 11, activeAt: null, startAt: null }, 'UTC', '/alerts')).toBeUndefined();
  });

  it('restores a valid exact route and normalizes an unsafe return target', () => {
    const route = readAlertInvestigationRoute(
      '11',
      new URLSearchParams(
        'start=1784249160000&end=1784250960000&timeZone=Asia%2FShanghai&returnTo=https%3A%2F%2Fevil.example'
      )
    );

    expect(route).toEqual({
      kind: 'ready',
      alertId: 11,
      window: { from: 1_784_249_160_000, to: 1_784_250_960_000, timeZone: 'Asia/Shanghai' },
      returnTo: '/alerts'
    });
  });

  it.each([
    ['0', 'start=1&end=2&timeZone=UTC'],
    ['11.5', 'start=1&end=2&timeZone=UTC'],
    ['9007199254740992', 'start=1&end=2&timeZone=UTC'],
    ['11', 'start=1&timeZone=UTC'],
    ['11', 'start=2&end=1&timeZone=UTC'],
    ['11', 'start=1&end=86400002&timeZone=UTC'],
    ['11', 'start=1&end=2&timeZone=not%2Fa-zone']
  ])('fails closed for alertId %s and search %s', (alertId, search) => {
    expect(readAlertInvestigationRoute(alertId, new URLSearchParams(search))).toEqual({ kind: 'invalid' });
  });

  it('accepts the exact 24 hour boundary', () => {
    expect(readAlertInvestigationRoute('11', new URLSearchParams('start=1&end=86400001&timeZone=UTC'))).toMatchObject({
      kind: 'ready',
      alertId: 11
    });
  });
});
