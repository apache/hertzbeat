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
      entityType: 'service',
      entityName: 'checkout',
      returnTo: `/log/manage?returnLabel=${localizedReturnLabel}`,
      traceId: 'trace-123',
      spanId: 'span-456',
      query: 'http_server_duration_milliseconds_count',
      filter: 'service.name="checkout"',
      aggregation: 'sum',
      temporalAggregation: 'rate',
      groupBy: 'service_name',
      legendFormat: '{{service.name}} - p95',
      formula: 'A * 1000',
      step: '60',
      limit: '25',
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
      '/ingestion/otlp/metrics?entityId=7&entityType=service&entityName=checkout&returnTo=%2Flog%2Fmanage&traceId=trace-123&spanId=span-456&query=http_server_duration_milliseconds_count&filter=service.name%3D%22checkout%22&aggregation=sum&temporalAggregation=rate&groupBy=service_name&legendFormat=%7B%7Bservice.name%7D%7D+-+p95&formula=A+*+1000&step=60&limit=25&timeRange=last-1h&serviceName=checkout&serviceNamespace=payments&environment=prod&collector=collector-a&template=spring-boot&start=1712730000000&end=1712733600000'
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

  it('rejects invalid metrics builder numeric controls instead of forwarding them', () => {
    expect(
      buildOtlpMetricsRoute({
        query: 'http_server_duration_milliseconds_count',
        filter: 'service.name="checkout"',
        step: '0',
        limit: '12.5'
      })
    ).toBe('/ingestion/otlp/metrics?query=http_server_duration_milliseconds_count&filter=service.name%3D%22checkout%22');
  });

  it('keeps table inspector mode in the metrics workbench URL', () => {
    expect(
      buildOtlpMetricsRoute({
        query: 'http.server.duration',
        inspector: 'table'
      })
    ).toBe('/ingestion/otlp/metrics?query=http.server.duration&inspector=table');

    expect(
      buildOtlpMetricsRoute({
        query: 'http.server.duration',
        inspector: 'heatmap' as 'table'
      })
    ).toBe('/ingestion/otlp/metrics?query=http.server.duration');
  });

  it('keeps selected metric series in the workbench URL for repeatable inspection', () => {
    expect(
      buildOtlpMetricsRoute({
        query: 'http.server.duration',
        inspector: 'table',
        series: 'http.server.duration-1'
      })
    ).toBe('/ingestion/otlp/metrics?query=http.server.duration&series=http.server.duration-1&inspector=table');
  });

  it('keeps related metric candidate metadata in the workbench URL', () => {
    const route = buildOtlpMetricsRoute({
      query: 'container.cpu.usage',
      filter: 'k8s.pod.name="checkout-7d9"',
      relatedMetricSource: 'pod',
      relatedMetricFamily: 'cpu',
      relatedMetricReason: 'resource-filter',
      relatedMetricMatchedLabels: 'k8s_pod_name',
      relatedMetricResourceMatch: '{"k8s_pod_name":"checkout-7d9"}'
    });
    const params = new URL(route, 'http://localhost').searchParams;
    expect(params.get('query')).toBe('container.cpu.usage');
    expect(params.get('filter')).toBe('k8s.pod.name="checkout-7d9"');
    expect(params.get('relatedMetricSource')).toBe('pod');
    expect(params.get('relatedMetricFamily')).toBe('cpu');
    expect(params.get('relatedMetricReason')).toBe('resource-filter');
    expect(params.get('relatedMetricMatchedLabels')).toBe('k8s_pod_name');
    expect(params.get('relatedMetricResourceMatch')).toBe('{"k8s_pod_name":"checkout-7d9"}');
  });

  it('keeps chart display settings in the metrics workbench URL', () => {
    expect(
      buildOtlpMetricsRoute({
        query: 'http.server.duration',
        warningThreshold: '75.5',
        criticalThreshold: '90',
        expectedRange: 'on'
      })
    ).toBe('/ingestion/otlp/metrics?query=http.server.duration&warningThreshold=75.5&criticalThreshold=90&expectedRange=on');

    expect(
      buildOtlpMetricsRoute({
        query: 'http.server.duration',
        warningThreshold: 'abc',
        criticalThreshold: 'Infinity',
        expectedRange: 'yes' as 'on'
      })
    ).toBe('/ingestion/otlp/metrics?query=http.server.duration');
  });

  it('keeps metrics legend format in the workbench URL', () => {
    expect(
      buildOtlpMetricsRoute({
        query: 'http.server.duration',
        groupBy: 'service.name',
        legendFormat: '{{service.name}} - p95',
        formula: 'A / 1024'
      })
    ).toBe('/ingestion/otlp/metrics?query=http.server.duration&groupBy=service.name&legendFormat=%7B%7Bservice.name%7D%7D+-+p95&formula=A+%2F+1024');
  });

  it('keeps metrics inventory search and sort in the workbench URL', () => {
    expect(
      buildOtlpMetricsRoute({
        query: 'http.server.duration',
        inventorySearch: 'checkout',
        inventorySort: 'time-series',
        inventoryPageSize: '20',
        inventoryPageIndex: '2',
        seriesAttributeSearch: 'deployment'
      })
    ).toBe('/ingestion/otlp/metrics?query=http.server.duration&inventorySearch=checkout&inventorySort=time-series&inventoryPageSize=20&inventoryPageIndex=2&seriesAttributeSearch=deployment');
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
