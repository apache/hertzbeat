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
import { EChartsOption } from 'echarts';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NgxEchartsModule } from 'ngx-echarts';
import { Subject, debounceTime, finalize, forkJoin, switchMap, takeUntil } from 'rxjs';

import { LogEntry } from '../../../pojo/LogEntry';
import { LogOverviewStats, LogQueryOptions, LogService } from '../../../service/log.service';
import { MemoryStorageService } from '../../../service/memory-storage.service';
import { SignalContext } from '../../../service/observability.service';
import { SignalNavigationComponent } from '../../observability/signal-navigation.component';
import {
  moveSignalTimeRangeToNow,
  readSignalCapability,
  readSignalTimeRange,
  toSignalTimeContext
} from '../../observability/signal-query-context';
import { SignalStorageGuideComponent } from '../../observability/signal-storage-guide.component';
import { SignalTimeRangeComponent } from '../../observability/signal-time-range.component';
import { LogStreamComponent } from '../log-stream/log-stream.component';

type LogViewMode = 'query' | 'stream';

export function trendBucketMillis(value: string): number {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric > 10_000_000_000_000 ? numeric / 1_000_000 : numeric;
  }
  return Date.parse(value);
}

@Component({
  selector: 'app-log-manage',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    I18nPipe,
    SharedModule,
    NgxEchartsModule,
    NzDrawerModule,
    NzEmptyModule,
    NzTableModule,
    NzTagModule,
    SignalNavigationComponent,
    SignalStorageGuideComponent,
    SignalTimeRangeComponent,
    LogStreamComponent
  ],
  templateUrl: './log-manage.component.html',
  styleUrl: './log-manage.component.less'
})
export class LogManageComponent implements OnInit, OnDestroy {
  readonly severityLevels = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
  mode: LogViewMode = 'query';
  timeRange: Date[] = [];
  serviceName = '';
  serviceNamespace = '';
  environment = '';
  traceId = '';
  spanId = '';
  severityText = '';
  searchContent = '';
  resource = '';
  refreshSeconds = 0;
  pageIndex = 1;
  pageSize = 20;
  total = 0;
  logs: LogEntry[] = [];
  overview: Partial<LogOverviewStats> = {};
  chartOption: EChartsOption = {};
  selected?: LogEntry;
  detailVisible = false;
  loading = false;
  error = '';
  private readonly queryChanges = new Subject<void>();
  private readonly destroyed = new Subject<void>();

  storageSupported = true;

  constructor(
    private logsService: LogService,
    private route: ActivatedRoute,
    private router: Router,
    private storage: MemoryStorageService
  ) {}

  ngOnInit(): void {
    this.storageSupported = readSignalCapability(this.storage, 'log');
    if (!this.storageSupported) {
      return;
    }
    const params = this.route.snapshot.queryParamMap;
    this.timeRange = readSignalTimeRange(params);
    this.mode = params.get('view') === 'stream' || this.route.snapshot.data['logMode'] === 'stream' ? 'stream' : 'query';
    this.traceId = params.get('traceId') || '';
    this.spanId = params.get('spanId') || '';
    this.serviceName = params.get('serviceName') || '';
    this.serviceNamespace = params.get('serviceNamespace') || '';
    this.environment = params.get('environment') || '';
    this.severityText = params.get('severityText') || '';
    this.searchContent = params.get('search') || '';
    this.resource = params.get('resource') || '';
    this.refreshSeconds = Math.max(0, Number(params.get('refresh')) || 0);
    this.queryChanges
      .pipe(
        debounceTime(250),
        switchMap(() => {
          this.loading = true;
          this.error = '';
          const options = this.options();
          return forkJoin({
            list: this.logsService.list(options),
            overview: this.logsService.overviewStats(options),
            trend: this.logsService.trendStats(options)
          }).pipe(finalize(() => (this.loading = false)));
        }),
        takeUntil(this.destroyed)
      )
      .subscribe({
        next: result => {
          if (result.list.code !== 0 || result.overview.code !== 0 || result.trend.code !== 0) {
            this.error = result.list.msg || result.overview.msg || result.trend.msg;
            return;
          }
          this.logs = result.list.data?.content || [];
          this.total = result.list.data?.totalElements || 0;
          this.overview = result.overview.data || {};
          this.chartOption = this.trendChart(result.trend.data?.hourlyStats || {});
          this.updateUrl(this.options());
        },
        error: error => (this.error = error?.error?.msg || error?.message || 'Storage unavailable')
      });
    if (this.mode === 'query') this.search();
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

  setMode(mode: LogViewMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.router.navigate(['/log/manage'], {
      queryParams: { ...toSignalTimeContext(this.timeRange), ...this.signalFilters(), view: mode === 'stream' ? 'stream' : null }
    });
    if (mode === 'query') this.search();
  }

  pageChanged(page: number): void {
    this.pageIndex = page;
    this.search();
  }

  open(log: LogEntry): void {
    this.selected = log;
    this.detailVisible = true;
  }

  openTrace(log: LogEntry): void {
    if (!log.traceId) return;
    this.router.navigate(['/trace/manage'], {
      queryParams: {
        start: this.timeRange[0].getTime(),
        end: this.timeRange[1].getTime(),
        traceId: log.traceId,
        serviceName: log.resource?.['service.name'],
        serviceNamespace: log.resource?.['service.namespace'],
        environment: log.resource?.['deployment.environment.name']
      }
    });
  }

  openMetrics(log: LogEntry): void {
    this.router.navigate(['/metrics/manage'], {
      queryParams: {
        start: this.timeRange[0].getTime(),
        end: this.timeRange[1].getTime(),
        serviceName: log.resource?.['service.name'],
        serviceNamespace: log.resource?.['service.namespace'],
        environment: log.resource?.['deployment.environment.name']
      }
    });
  }

  navigationContext(): SignalContext & { refresh?: number } {
    return {
      ...toSignalTimeContext(this.timeRange),
      serviceName: this.serviceName,
      serviceNamespace: this.serviceNamespace,
      environment: this.environment,
      traceId: this.traceId,
      spanId: this.spanId,
      refresh: this.refreshSeconds || undefined
    };
  }

  bodyText(log: LogEntry): string {
    return typeof log.body === 'string' ? log.body : JSON.stringify(log.body);
  }

  service(log: LogEntry): string {
    return String(log.resource?.['service.name'] || '-');
  }

  detailJson(): string {
    return JSON.stringify(this.selected, null, 2);
  }

  severityColor(value?: number): string {
    if (!value) return 'default';
    if (value >= 17) return 'error';
    if (value >= 13) return 'warning';
    if (value >= 9) return 'processing';
    return 'default';
  }

  private options(): LogQueryOptions {
    return {
      ...toSignalTimeContext(this.timeRange),
      traceId: this.traceId,
      spanId: this.spanId,
      severityText: this.severityText,
      search: this.searchContent,
      serviceName: this.serviceName,
      serviceNamespace: this.serviceNamespace,
      environment: this.environment,
      resource: this.resource,
      pageIndex: this.pageIndex - 1,
      pageSize: this.pageSize
    };
  }

  private updateUrl(options: LogQueryOptions): void {
    const { pageIndex, pageSize, ...context } = options;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...context, view: this.mode === 'stream' ? 'stream' : null, refresh: this.refreshSeconds || null },
      replaceUrl: true
    });
  }

  private signalFilters(): Pick<LogQueryOptions, 'traceId' | 'spanId' | 'serviceName' | 'serviceNamespace' | 'environment'> {
    return {
      traceId: this.traceId,
      spanId: this.spanId,
      serviceName: this.serviceName,
      serviceNamespace: this.serviceNamespace,
      environment: this.environment
    };
  }

  private trendChart(hourly: Record<string, number>): EChartsOption {
    const times = Object.keys(hourly).sort();
    return {
      animation: false,
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 20, top: 18, bottom: 36 },
      xAxis: {
        type: 'category',
        data: times.map(time => {
          const millis = trendBucketMillis(time);
          return Number.isFinite(millis)
            ? new Date(millis).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
            : time;
        })
      },
      yAxis: { type: 'value' },
      series: [{ type: 'line', showSymbol: false, areaStyle: { opacity: 0.12 }, data: times.map(time => hourly[time]) }]
    };
  }
}
