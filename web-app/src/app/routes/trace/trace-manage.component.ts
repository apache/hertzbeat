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

import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { I18nPipe } from '@delon/theme';
import { SharedModule } from '@shared';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { Subject, debounceTime, finalize, forkJoin, switchMap, takeUntil } from 'rxjs';

import {
  ObservabilityService,
  SignalContext,
  TraceDetail,
  TraceListItem,
  TraceOverview,
  TraceSpanNode
} from '../../service/observability.service';
import { SignalNavigationComponent } from '../observability/signal-navigation.component';
import { moveSignalTimeRangeToNow, readSignalTimeRange, toSignalTimeContext } from '../observability/signal-query-context';
import { SignalTimeRangeComponent } from '../observability/signal-time-range.component';

@Component({
  selector: 'app-trace-manage',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    I18nPipe,
    SharedModule,
    NzDrawerModule,
    NzEmptyModule,
    NzTableModule,
    NzTagModule,
    SignalNavigationComponent,
    SignalTimeRangeComponent
  ],
  templateUrl: './trace-manage.component.html',
  styleUrl: './trace-manage.component.less'
})
export class TraceManageComponent implements OnInit, OnDestroy {
  timeRange: Date[] = [];
  serviceName = '';
  serviceNamespace = '';
  environment = '';
  operationName = '';
  traceId = '';
  errorOnly = false;
  minDurationMs?: number;
  maxDurationMs?: number;
  refreshSeconds = 0;
  pageIndex = 1;
  pageSize = 20;
  total = 0;
  traces: TraceListItem[] = [];
  overview: TraceOverview = { totalCount: 0, errorCount: 0, errorRate: 0, averageDurationMillis: 0, p95DurationMillis: 0 };
  selected?: TraceDetail;
  selectedSpan?: TraceSpanNode;
  detailVisible = false;
  loading = false;
  detailLoading = false;
  error = '';
  private readonly queryChanges = new Subject<void>();
  private readonly destroyed = new Subject<void>();

  constructor(private observability: ObservabilityService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.timeRange = readSignalTimeRange(params);
    this.traceId = params.get('traceId') || '';
    this.serviceName = params.get('serviceName') || '';
    this.serviceNamespace = params.get('serviceNamespace') || '';
    this.environment = params.get('environment') || '';
    this.operationName = params.get('operationName') || '';
    this.errorOnly = params.get('errorOnly') === 'true';
    this.minDurationMs = this.readOptionalNumber(params.get('minDurationMs'));
    this.maxDurationMs = this.readOptionalNumber(params.get('maxDurationMs'));
    this.refreshSeconds = Math.max(0, Number(params.get('refresh')) || 0);
    this.queryChanges
      .pipe(
        debounceTime(250),
        switchMap(() => {
          this.loading = true;
          this.error = '';
          return forkJoin({
            list: this.observability.queryTraces(
              this.context(),
              this.pageIndex - 1,
              this.pageSize,
              this.errorOnly,
              this.minDurationMs,
              this.maxDurationMs
            ),
            overview: this.observability.traceOverview(this.context(), this.errorOnly)
          }).pipe(finalize(() => (this.loading = false)));
        }),
        takeUntil(this.destroyed)
      )
      .subscribe({
        next: result => {
          if (result.list.code !== 0 || result.overview.code !== 0) {
            this.error = result.list.msg || result.overview.msg;
            return;
          }
          this.traces = result.list.data?.content || [];
          this.total = result.list.data?.totalElements || 0;
          this.overview = result.overview.data || this.overview;
          this.updateUrl();
        },
        error: error => (this.error = error?.error?.msg || error?.message || 'Storage unavailable')
      });
    this.search();
  }

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
  }

  search(): void {
    this.queryChanges.next();
  }

  refreshToNow(): void {
    this.timeRange = moveSignalTimeRangeToNow(this.timeRange);
    this.search();
  }

  pageChanged(page: number): void {
    this.pageIndex = page;
    this.search();
  }

  openTrace(trace: TraceListItem): void {
    this.detailVisible = true;
    this.detailLoading = true;
    this.observability
      .traceDetail(trace.traceId)
      .pipe(
        finalize(() => (this.detailLoading = false)),
        takeUntil(this.destroyed)
      )
      .subscribe({
        next: message => {
          if (message.code === 0) {
            this.selected = message.data;
            this.selectedSpan = message.data?.spans?.[0];
          } else this.error = message.msg;
        },
        error: error => (this.error = error?.error?.msg || error?.message || 'Storage unavailable')
      });
  }

  selectSpan(span: TraceSpanNode): void {
    this.selectedSpan = span;
  }

  viewLogs(): void {
    if (!this.selected?.summary) return;
    const summary = this.selected.summary;
    this.router.navigate(['/log/manage'], {
      queryParams: {
        ...this.timeContext(summary),
        traceId: summary.traceId,
        environment: summary.resourceAttributes?.['deployment.environment.name']
      }
    });
  }

  viewMetrics(): void {
    if (!this.selected?.summary) return;
    const summary = this.selected.summary;
    this.router.navigate(['/metrics/manage'], {
      queryParams: {
        ...this.timeContext(summary),
        serviceName: summary.serviceName,
        serviceNamespace: summary.serviceNamespace,
        environment: summary.resourceAttributes?.['deployment.environment.name'],
        operationName: summary.rootSpanName
      }
    });
  }

  navigationContext(): SignalContext & { refresh?: number } {
    return { ...this.context(), refresh: this.refreshSeconds || undefined };
  }

  waterfallOffset(span: TraceSpanNode): number {
    const spans = this.selected?.spans || [];
    const start = Math.min(...spans.map(item => item.startTime));
    const end = Math.max(...spans.map(item => item.startTime + item.durationNanos / 1_000_000));
    return end === start ? 0 : ((span.startTime - start) / (end - start)) * 100;
  }

  waterfallWidth(span: TraceSpanNode): number {
    const spans = this.selected?.spans || [];
    const start = Math.min(...spans.map(item => item.startTime));
    const end = Math.max(...spans.map(item => item.startTime + item.durationNanos / 1_000_000));
    return Math.max(0.7, (span.durationNanos / 1_000_000 / Math.max(1, end - start)) * 100);
  }

  waterfallDurationMs(): number {
    const spans = this.selected?.spans || [];
    if (!spans.length) return 0;
    const start = Math.min(...spans.map(item => item.startTime));
    const end = Math.max(...spans.map(item => item.startTime + item.durationNanos / 1_000_000));
    return Math.max(0, end - start);
  }

  spanDepth(span: TraceSpanNode): number {
    const spans = this.selected?.spans || [];
    const byId = new Map(spans.map(item => [item.spanId, item]));
    let current = span;
    let depth = 0;
    const visited = new Set<string>();
    while (current.parentSpanId && byId.has(current.parentSpanId) && !visited.has(current.parentSpanId)) {
      visited.add(current.parentSpanId);
      current = byId.get(current.parentSpanId)!;
      depth++;
    }
    return Math.min(depth, 8);
  }

  isErrorSpan(span?: TraceSpanNode): boolean {
    return span?.status === 'ERROR' || span?.status === 'STATUS_CODE_ERROR';
  }

  spanStatus(span: TraceSpanNode): string {
    return this.isErrorSpan(span) ? 'ERROR' : 'OK';
  }

  private context(): SignalContext {
    return {
      ...toSignalTimeContext(this.timeRange),
      traceId: this.traceId,
      serviceName: this.serviceName,
      serviceNamespace: this.serviceNamespace,
      environment: this.environment,
      operationName: this.operationName
    };
  }

  private updateUrl(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        ...this.context(),
        errorOnly: this.errorOnly || null,
        minDurationMs: this.minDurationMs ?? null,
        maxDurationMs: this.maxDurationMs ?? null,
        refresh: this.refreshSeconds || null
      },
      replaceUrl: true
    });
  }

  private readOptionalNumber(value: string | null): number | undefined {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private timeContext(trace: TraceListItem): { start: number; end: number } {
    const padding = Math.max(30_000, trace.durationNanos / 1_000_000 + 5_000);
    return { start: trace.startTime - padding, end: trace.startTime + padding };
  }
}
