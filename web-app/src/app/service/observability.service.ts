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

import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap, timer } from 'rxjs';

import { SILENT_HTTP_ERROR } from '../core/interceptor/http-context';
import { Message } from '../pojo/Message';

export interface OtlpConnectionForm {
  endpoint: string;
  token: string;
  serviceName: string;
  environment: string;
}

export interface SignalProbeResult {
  signal: 'metrics' | 'logs' | 'traces';
  status: 'success' | 'error';
  lastReceived?: number;
  error?: string;
  errorKey?: string;
}

export interface SignalContext {
  start?: number;
  end?: number;
  serviceName?: string;
  serviceNamespace?: string;
  environment?: string;
  traceId?: string;
  spanId?: string;
  operationName?: string;
}

export interface MetricPoint {
  timestamp: number;
  value: number;
}

export interface MetricSeries {
  labels: Record<string, string>;
  points: MetricPoint[];
}

export interface MetricsConsole {
  query: string;
  start: number;
  end: number;
  step: number;
  series: MetricSeries[];
}

export interface TraceListItem {
  traceId: string;
  rootSpanId: string;
  serviceName: string;
  serviceNamespace: string;
  rootSpanName: string;
  durationNanos: number;
  status: string;
  startTime: number;
  errorSpanCount: number;
  resourceAttributes: Record<string, string>;
}

export interface TraceSpanNode {
  traceId: string;
  spanId: string;
  parentSpanId: string;
  spanName: string;
  serviceName: string;
  status: string;
  spanKind: string;
  statusMessage: string;
  durationNanos: number;
  startTime: number;
  resourceAttributes: Record<string, string>;
  spanAttributes: Record<string, string>;
  spanEvents: TraceSpanEvent[];
}

export interface TraceSpanEvent {
  name: string;
  time: string;
  attributes: Record<string, unknown>;
}

export interface TraceDetail {
  summary: TraceListItem;
  spans: TraceSpanNode[];
}

export interface TraceOverview {
  totalCount: number;
  errorCount: number;
  errorRate: number;
  averageDurationMillis: number;
  p95DurationMillis: number;
}

export interface SignalPage<T> {
  content: T[];
  pageIndex: number;
  pageSize: number;
  totalElements: number;
}

interface LogProbeEntry {
  timeUnixNano: number | string;
}

@Injectable({ providedIn: 'root' })
export class ObservabilityService {
  private readonly silentProbeContext = new HttpContext().set(SILENT_HTTP_ERROR, true);

  constructor(private http: HttpClient) {}

  probe(config: OtlpConnectionForm): Observable<SignalProbeResult[]> {
    const now = Date.now();
    const traceId = this.randomHex(32);
    const spanId = this.randomHex(16);
    return forkJoin([
      this.probeMetrics(config, now),
      this.probeLogs(config, now, traceId, spanId),
      this.probeTraces(config, now, traceId, spanId)
    ]);
  }

  metricInventory(context: SignalContext, limit = 100): Observable<Message<{ metricNames: string[] }>> {
    return this.http.get<Message<{ metricNames: string[] }>>('/ingestion/otlp/metrics/inventory', {
      params: this.contextParams(context).set('limit', limit)
    });
  }

  queryMetrics(
    context: SignalContext,
    query: string,
    filter?: string,
    groupBy?: string,
    aggregation?: string,
    step = 30
  ): Observable<Message<MetricsConsole>> {
    let params = this.contextParams(context).set('query', query).set('step', step);
    if (filter) params = params.set('filter', filter);
    if (groupBy) params = params.set('groupBy', groupBy);
    if (aggregation) params = params.set('aggregation', aggregation);
    return this.http.get<Message<MetricsConsole>>('/ingestion/otlp/metrics/console', { params });
  }

  queryTraces(
    context: SignalContext,
    pageIndex: number,
    pageSize: number,
    errorOnly = false,
    minDurationMs?: number,
    maxDurationMs?: number
  ): Observable<Message<SignalPage<TraceListItem>>> {
    let params = this.contextParams(context).set('pageIndex', pageIndex).set('pageSize', pageSize).set('errorOnly', errorOnly);
    if (minDurationMs != null) params = params.set('minDurationMs', minDurationMs);
    if (maxDurationMs != null) params = params.set('maxDurationMs', maxDurationMs);
    return this.http.get<Message<SignalPage<TraceListItem>>>('/traces/list', { params });
  }

  traceOverview(context: SignalContext, errorOnly = false): Observable<Message<TraceOverview>> {
    return this.http.get<Message<TraceOverview>>('/traces/stats/overview', {
      params: this.contextParams(context).set('errorOnly', errorOnly)
    });
  }

  traceDetail(traceId: string): Observable<Message<TraceDetail>> {
    return this.http.get<Message<TraceDetail>>(`/traces/${encodeURIComponent(traceId)}`);
  }

  private probeMetrics(config: OtlpConnectionForm, now: number): Observable<SignalProbeResult> {
    const payload = {
      resourceMetrics: [
        {
          resource: { attributes: this.resourceAttributes(config) },
          scopeMetrics: [
            {
              scope: { name: 'hertzbeat-onboarding' },
              metrics: [
                {
                  name: 'hertzbeat_onboarding_probe',
                  gauge: { dataPoints: [{ timeUnixNano: this.toNanos(now), asDouble: 1 }] }
                }
              ]
            }
          ]
        }
      ]
    };
    return this.send(config, 'metrics', payload).pipe(
      switchMap(() => timer(800)),
      switchMap(() => {
        const params = this.signalParams(config, now).set('query', 'hertzbeat_onboarding_probe').set('step', 1);
        return this.http.get<Message<MetricsConsole>>('/ingestion/otlp/metrics/console', {
          params,
          context: this.silentProbeContext
        });
      }),
      map(message => {
        const values = message.data?.series?.flatMap(series => series.points) || [];
        const latest = values.reduce((value, point) => Math.max(value, Number(point.timestamp)), 0);
        if (message.code !== 0 || !latest) throw new Error(message.msg || 'Metric probe was not found');
        return { signal: 'metrics', status: 'success', lastReceived: latest } as SignalProbeResult;
      }),
      catchError(error => of(this.failedProbe('metrics', error)))
    );
  }

  private probeLogs(config: OtlpConnectionForm, now: number, traceId: string, spanId: string): Observable<SignalProbeResult> {
    const payload = {
      resourceLogs: [
        {
          resource: { attributes: this.resourceAttributes(config) },
          scopeLogs: [
            {
              scope: { name: 'hertzbeat-onboarding' },
              logRecords: [
                {
                  timeUnixNano: this.toNanos(now),
                  observedTimeUnixNano: this.toNanos(now),
                  severityNumber: 'SEVERITY_NUMBER_INFO',
                  severityText: 'INFO',
                  body: { stringValue: 'HertzBeat OTLP onboarding probe' },
                  traceId,
                  spanId
                }
              ]
            }
          ]
        }
      ]
    };
    return this.send(config, 'logs', payload).pipe(
      switchMap(() => timer(800)),
      switchMap(() =>
        this.http.get<Message<SignalPage<LogProbeEntry>>>('/logs/list', {
          params: this.signalParams(config, now).set('traceId', traceId).set('pageSize', 1),
          context: this.silentProbeContext
        })
      ),
      map(message => {
        const entry = message.data?.content?.[0];
        if (message.code !== 0 || !entry) throw new Error(message.msg || 'Log probe was not found');
        return {
          signal: 'logs',
          status: 'success',
          lastReceived: Number(entry.timeUnixNano) / 1_000_000
        } as SignalProbeResult;
      }),
      catchError(error => of(this.failedProbe('logs', error)))
    );
  }

  private probeTraces(config: OtlpConnectionForm, now: number, traceId: string, spanId: string): Observable<SignalProbeResult> {
    const payload = {
      resourceSpans: [
        {
          resource: { attributes: this.resourceAttributes(config) },
          scopeSpans: [
            {
              scope: { name: 'hertzbeat-onboarding' },
              spans: [
                {
                  traceId,
                  spanId,
                  name: 'hertzbeat.onboarding.probe',
                  kind: 'SPAN_KIND_INTERNAL',
                  startTimeUnixNano: this.toNanos(now),
                  endTimeUnixNano: this.toNanos(now + 10),
                  status: { code: 'STATUS_CODE_OK' }
                }
              ]
            }
          ]
        }
      ]
    };
    return this.send(config, 'traces', payload).pipe(
      switchMap(() => timer(800)),
      switchMap(() =>
        this.http.get<Message<SignalPage<TraceListItem>>>('/traces/list', {
          params: this.signalParams(config, now).set('traceId', traceId).set('pageSize', 1),
          context: this.silentProbeContext
        })
      ),
      map(message => {
        if (message.code !== 0 || !message.data?.content?.length) {
          throw new Error(message.msg || 'Trace probe was not found');
        }
        return { signal: 'traces', status: 'success', lastReceived: now } as SignalProbeResult;
      }),
      catchError(error => of(this.failedProbe('traces', error)))
    );
  }

  private send(config: OtlpConnectionForm, signal: string, payload: unknown): Observable<unknown> {
    const endpoint = config.endpoint.replace(/\/+$/, '');
    const headers = new HttpHeaders({ Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' });
    return this.http.post(`${endpoint}/api/otlp/v1/${signal}`, payload, { headers, context: this.silentProbeContext });
  }

  private signalParams(config: OtlpConnectionForm, now: number): HttpParams {
    return new HttpParams()
      .set('start', now - 60_000)
      .set('end', now + 60_000)
      .set('serviceName', config.serviceName)
      .set('environment', config.environment);
  }

  contextParams(context: SignalContext): HttpParams {
    let params = new HttpParams();
    Object.entries(context).forEach(([key, value]) => {
      if (value != null && value !== '') params = params.set(key, value);
    });
    return params;
  }

  private resourceAttributes(config: OtlpConnectionForm): unknown[] {
    return [
      { key: 'service.name', value: { stringValue: config.serviceName } },
      { key: 'deployment.environment.name', value: { stringValue: config.environment } }
    ];
  }

  private toNanos(timestamp: number): string {
    return (BigInt(timestamp) * 1_000_000n).toString();
  }

  private randomHex(length: number): string {
    const bytes = new Uint8Array(length / 2);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
  }

  private failedProbe(signal: SignalProbeResult['signal'], error: unknown): SignalProbeResult {
    const failure = this.asRecord(error);
    const response = failure?.['error'];
    if (error instanceof ProgressEvent || failure?.['status'] === 0 || response instanceof ProgressEvent) {
      return { signal, status: 'error', errorKey: 'observability.integration.error.network' };
    }
    const responseMessage = this.asRecord(response)?.['msg'];
    const responseBody = typeof response === 'string' ? response : undefined;
    const message = failure?.['message'];
    const detail =
      typeof responseMessage === 'string' ? responseMessage : responseBody || (typeof message === 'string' ? message : undefined);
    return {
      signal,
      status: 'error',
      error: detail,
      errorKey: detail ? undefined : 'observability.integration.error.request'
    };
  }

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;
  }
}
