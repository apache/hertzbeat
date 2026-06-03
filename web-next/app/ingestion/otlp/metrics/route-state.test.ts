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
import { buildOtlpMetricsRoute, hasMetricsDisplayReturnLabel } from './route-state';
import { createTranslatorMock } from '../../../../test/i18n-test-helper';

describe('otlp metrics route state', () => {
  it('drops localized display labels from metrics workbench URLs', () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    const localizedReturnLabel = t('log.manage.route.title');
    const route = buildOtlpMetricsRoute({
      entityId: '7',
      entityName: 'checkout',
      returnTo: `/log/manage?returnLabel=${localizedReturnLabel}`,
      traceId: 'trace-123',
      spanId: 'span-456',
      query: 'http_server_duration_milliseconds_count',
      aggregation: 'sum',
      groupBy: 'service_name',
      timeRange: 'last-1h',
      collector: 'collector-a',
      template: 'spring-boot',
      serviceName: 'checkout',
      serviceNamespace: 'payments',
      environment: 'prod',
      start: '1712730000000',
      end: '1712733600000'
    });

    expect(route).toBe(
      '/ingestion/otlp/metrics?entityId=7&entityName=checkout&returnTo=%2Flog%2Fmanage&traceId=trace-123&spanId=span-456&query=http_server_duration_milliseconds_count&aggregation=sum&groupBy=service_name&timeRange=last-1h&serviceName=checkout&serviceNamespace=payments&environment=prod&collector=collector-a&template=spring-boot&start=1712730000000&end=1712733600000'
    );
    expect(route).not.toContain('returnLabel=');
    expect(route).not.toContain(encodeURIComponent(localizedReturnLabel));
  });

  it('detects legacy display labels in direct and nested return URLs', () => {
    expect(hasMetricsDisplayReturnLabel(new URLSearchParams('returnLabel=Metrics'))).toBe(true);
    expect(hasMetricsDisplayReturnLabel(new URLSearchParams('returnTo=%2Flog%2Fmanage%3FreturnLabel%3DLogs'))).toBe(true);
    expect(hasMetricsDisplayReturnLabel(new URLSearchParams('returnTo=%2Flog%2Fmanage'))).toBe(false);
  });

  it('rejects decimal time bounds in metrics workbench URLs instead of rounding them', () => {
    expect(
      buildOtlpMetricsRoute({
        traceId: 'trace-123',
        serviceName: 'checkout',
        start: '1777484896189.989',
        end: '1777485856189.989'
      })
    ).toBe('/ingestion/otlp/metrics?traceId=trace-123&serviceName=checkout');
  });

  it('rejects decimal entity ids in metrics workbench URLs instead of forwarding them', () => {
    expect(
      buildOtlpMetricsRoute({
        entityId: '7.5',
        entityName: 'checkout',
        serviceName: 'checkout'
      })
    ).toBe('/ingestion/otlp/metrics?entityName=checkout&serviceName=checkout');
  });

  it('keeps the shared time context keys when metrics opens another signal window', () => {
    const route = buildOtlpMetricsRoute({
      serviceName: 'checkout',
      timeRange: 'last-6h',
      start: '1712730000000',
      end: '1712751600000',
      refresh: '30',
      live: 'false',
      tz: 'Asia/Shanghai'
    });

    expect(route).toBe(
      '/ingestion/otlp/metrics?timeRange=last-6h&serviceName=checkout&start=1712730000000&end=1712751600000&refresh=30&live=false&tz=Asia%2FShanghai'
    );
  });

  it('keeps readable expression time windows in metrics workbench URLs', () => {
    const route = buildOtlpMetricsRoute({
      serviceName: 'checkout',
      timeRange: 'last-1h',
      from: '2026-05-17 15:30:00',
      to: '2026-05-17 16:30:00',
      timezone: 'Asia/Shanghai',
      start: '1779003000000',
      end: '1779006600000'
    });

    expect(route).toBe(
      '/ingestion/otlp/metrics?timeRange=last-1h&from=2026-05-17+15%3A30%3A00&to=2026-05-17+16%3A30%3A00&serviceName=checkout&timezone=Asia%2FShanghai'
    );
    expect(route).not.toContain('start=');
    expect(route).not.toContain('end=');
  });
});
