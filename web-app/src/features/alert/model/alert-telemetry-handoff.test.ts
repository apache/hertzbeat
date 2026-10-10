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

import type { AlertRecord } from './alert-model';
import { alertTelemetryHandoffs } from './alert-telemetry-handoff';

describe('alert telemetry handoff', () => {
  it('rejects missing, alias-only, or control-bearing service scope', () => {
    expect(alertTelemetryHandoffs(alert({ alertname: 'CPU' }))).toEqual([]);
    expect(alertTelemetryHandoffs(alert({ instance: 'checkout', job: 'payments' }))).toEqual([]);
    expect(alertTelemetryHandoffs(alert({ 'service.name': 'checkout\nprivate' }))).toEqual([]);
  });

  it('rejects present malformed canonical namespace or environment instead of broadening service scope', () => {
    const time = { activeAt: 1_784_250_060_000 };

    expect(alertTelemetryHandoffs(alert({ 'service.name': 'checkout', 'service.namespace': '   ' }, time))).toEqual([]);
    expect(
      alertTelemetryHandoffs(
        alert({ 'service.name': 'checkout', 'deployment.environment.name': 'prod\nprivate' }, time)
      )
    ).toEqual([]);
  });

  it('uses only the standard OTLP service key when legacy aliases are also present', () => {
    const paths = alertTelemetryHandoffs(
      alert({ 'service.name': 'checkout', instance: 'checkout-1' }, { activeAt: 1_784_250_060_000 })
    );

    expect(paths[0]?.path).toContain('serviceName=checkout');
    expect(paths[0]?.path).not.toContain('checkout-1');
  });

  it('freezes a fixed window around activeAt and ignores different startAt and endAt values', () => {
    const paths = alertTelemetryHandoffs(
      alert(
        { 'service.name': 'checkout' },
        { startAt: 1_784_250_000_000, activeAt: 1_784_250_060_000, endAt: 1_784_250_120_000 }
      )
    );

    expect(paths[0]?.path).toContain('start=1784249160000&end=1784250960000');
    expect(paths[0]?.path).not.toContain('1784249100000');
    expect(paths[0]?.path).not.toContain('1784251020000');
  });

  it('falls back to startAt only when activeAt is absent', () => {
    const paths = alertTelemetryHandoffs(
      alert({ 'service.name': 'checkout' }, { startAt: 1_784_250_000_000, activeAt: null })
    );

    expect(paths[0]?.path).toContain('start=1784249100000&end=1784250900000');
  });

  it('suppresses the quick handoff when an exact persisted time scope is unavailable', () => {
    const paths = alertTelemetryHandoffs(
      alert({
        'service.name': ' checkout ',
        'service.namespace': 'commerce',
        'deployment.environment.name': 'prod'
      })
    );

    expect(paths).toEqual([]);
    expect(alertTelemetryHandoffs(alert({ 'service.name': 'checkout' }, { activeAt: 0 }))).toEqual([]);
  });
});

function alert(
  labels: Record<string, string>,
  times: Partial<Pick<AlertRecord, 'startAt' | 'activeAt' | 'endAt'>> = {}
): AlertRecord {
  return {
    id: 11,
    labels,
    annotations: null,
    content: null,
    status: 'firing',
    triggerTimes: null,
    startAt: times.startAt ?? null,
    activeAt: times.activeAt ?? null,
    endAt: times.endAt ?? null
  };
}
