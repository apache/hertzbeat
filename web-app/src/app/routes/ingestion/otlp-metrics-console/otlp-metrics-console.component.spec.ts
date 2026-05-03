/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { OpsWorkspaceFacade } from '../../../core/ops-workspace/ops-workspace.facade';
import { Message } from '../../../pojo/Message';
import { OtlpMetricsConsole } from '../../../pojo/OtlpIngestion';
import { OtlpIngestionService } from '../../../service/otlp-ingestion.service';
import { ThemeService } from '../../../service/theme.service';
import { OtlpMetricsConsoleComponent } from './otlp-metrics-console.component';

describe('OtlpMetricsConsoleComponent', () => {
  function successMessage<T>(data: T): Message<T> {
    const message = new Message<T>();
    message.code = 0;
    message.msg = '';
    message.data = data;
    return message;
  }

  function createConsolePayload(): OtlpMetricsConsole {
    const payload = new OtlpMetricsConsole();
    payload.context.entityId = 42;
    payload.context.entityName = 'Checkout API';
    payload.context.serviceName = 'checkout';
    payload.context.serviceNamespace = 'commerce';
    payload.context.environment = 'prod';
    payload.context.start = 1_000;
    payload.context.end = 2_000;
    payload.query = 'sum by (__name__) ({service_name="checkout"})';
    payload.datasource = 'Greptime-promql';
    payload.queryMode = 'promql';
    payload.stats.totalSeries = 1;
    payload.stats.nonEmptySeries = 1;
    payload.stats.latestObservedAt = 2_000;
    payload.results = {
      refId: 'otlp-metrics-console',
      status: 200,
      frames: [
        {
          schema: {
            fields: [
              { name: '__ts__', type: 'time' },
              { name: '__value__', type: 'number' }
            ],
            labels: { __name__: 'http_server_requests_seconds_count' },
            meta: {}
          },
          data: [
            [1_000, 12],
            [2_000, 14]
          ]
        }
      ]
    };
    return payload;
  }

  function createComponent(queryParams: Record<string, string> = {}) {
    const route = { queryParams: of(queryParams) } as ActivatedRoute;
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const otlpIngestionSvc = jasmine.createSpyObj<OtlpIngestionService>('OtlpIngestionService', ['getMetricsConsole']);
    otlpIngestionSvc.getMetricsConsole.and.returnValue(of(successMessage(createConsolePayload())));
    const workspace = new OpsWorkspaceFacade();
    const component = new OtlpMetricsConsoleComponent(
      route,
      router,
      otlpIngestionSvc,
      { fanyi: (key: string) => key } as any,
      workspace,
      { getTheme: () => 'dark-ops' } as ThemeService
    );
    return { component, otlpIngestionSvc, router, workspace };
  }

  it('should query the OTLP metrics console using route context and build chart data', () => {
    const { component, otlpIngestionSvc } = createComponent({
      entityId: '42',
      entityName: 'Checkout API',
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      environment: 'prod',
      start: '1000',
      end: '2000'
    });

    component.ngOnInit();

    expect(otlpIngestionSvc.getMetricsConsole).toHaveBeenCalledWith(
      jasmine.objectContaining({
        entityId: '42',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'prod',
        start: 1000,
        end: 2000
      })
    );
    expect(component.chartOption.series).toBeDefined();
    expect(component.metricSeries.length).toBe(1);
    expect(component.metricSeries[0].name).toBe('http_server_requests_seconds_count');
  });

  it('should preserve entity and time-range context when opening the log console', () => {
    const { component, router } = createComponent({
      entityId: '42',
      entityName: 'Checkout API',
      serviceName: 'checkout',
      start: '1000',
      end: '2000'
    });
    component.ngOnInit();

    component.openLogConsole();

    expect(router.navigate).toHaveBeenCalledWith(['/log/manage'], {
      queryParams: jasmine.objectContaining({
        entityId: '42',
        entityName: 'Checkout API',
        serviceName: 'checkout',
        start: '1000',
        end: '2000',
        returnTo: '/ingestion/otlp/metrics',
        returnLabel: 'ingestion.otlp.metrics.title'
      })
    });
  });

  it('should expose shared stage meta chips for query and chart headers', () => {
    const { component } = createComponent({
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      environment: 'prod'
    });
    component.ngOnInit();

    expect(component.metricsQueryStageMetaChips).toEqual([{ text: 'ingestion.otlp.metrics.result.filters · 5', tone: 'accent' }]);
    expect(component.metricsChartStageMetaChips).toEqual([
      { text: 'ingestion.otlp.metrics.result.datasource · Greptime-promql', tone: 'accent' },
      { text: 'ingestion.otlp.metrics.result.series · 1', tone: 'success' }
    ]);
  });

  it('should expose shared facts for the console overview strip', () => {
    const { component } = createComponent({
      serviceName: 'checkout',
      serviceNamespace: 'commerce',
      environment: 'prod'
    });
    component.ngOnInit();

    expect(component.metricsConsoleFacts).toEqual([
      { label: 'ingestion.otlp.metrics.result.series', value: '1', tone: 'accent' },
      { label: 'ingestion.otlp.metrics.result.non-empty', value: '1', tone: 'success' },
      { label: 'ingestion.otlp.metrics.result.filters', value: '5', tone: 'warning' },
      { label: 'ingestion.otlp.metrics.result.datasource', value: 'Greptime-promql', tone: 'accent' }
    ]);
  });
});
