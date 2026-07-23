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
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NgxEchartsModule } from 'ngx-echarts';
import { Subject, debounceTime, finalize, switchMap, takeUntil } from 'rxjs';

import { MemoryStorageService } from '../../service/memory-storage.service';
import { MetricSeries, ObservabilityService, SignalContext } from '../../service/observability.service';
import { SignalNavigationComponent } from '../observability/signal-navigation.component';
import { moveSignalTimeRangeToNow, readSignalCapability, readSignalTimeRange, toSignalTimeContext } from '../observability/signal-query-context';
import { SignalStorageGuideComponent } from '../observability/signal-storage-guide.component';
import { SignalTimeRangeComponent } from '../observability/signal-time-range.component';

interface MetricTableRow {
  timestamp: number;
  value: number;
  labels: Record<string, string>;
}

@Component({
  selector: 'app-metrics-manage',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    I18nPipe,
    SharedModule,
    NgxEchartsModule,
    NzTableModule,
    NzEmptyModule,
    NzDrawerModule,
    NzAutocompleteModule,
    SignalNavigationComponent,
    SignalStorageGuideComponent,
    SignalTimeRangeComponent
  ],
  templateUrl: './metrics-manage.component.html',
  styleUrl: './metrics-manage.component.less'
})
export class MetricsManageComponent implements OnInit, OnDestroy {
  timeRange: Date[] = [];
  query = '';
  step = 30;
  refreshSeconds = 0;
  serviceName = '';
  serviceNamespace = '';
  environment = '';
  operationName = '';
  metricNames: string[] = [];
  series: MetricSeries[] = [];
  rows: MetricTableRow[] = [];
  summary = { sampleCount: 0, minimum: 0, maximum: 0, latest: 0 };
  chartOption: EChartsOption = {};
  loading = false;
  error = '';
  detailVisible = false;
  selectedSeries?: MetricSeries;
  private readonly queryChanges = new Subject<void>();
  private readonly destroyed = new Subject<void>();

  storageSupported = true;

  constructor(
    private observability: ObservabilityService,
    private route: ActivatedRoute,
    private router: Router,
    private storage: MemoryStorageService
  ) {}

  ngOnInit(): void {
    this.storageSupported = readSignalCapability(this.storage, 'metric');
    if (!this.storageSupported) {
      return;
    }
    const params = this.route.snapshot.queryParamMap;
    this.timeRange = readSignalTimeRange(params);
    this.serviceName = params.get('serviceName') || '';
    this.serviceNamespace = params.get('serviceNamespace') || '';
    this.environment = params.get('environment') || '';
    this.operationName = params.get('operationName') || '';
    this.query = params.get('query') || '';
    this.step = Math.max(1, Math.min(Number(params.get('step')) || 30, 3600));
    this.refreshSeconds = Math.max(0, Number(params.get('refresh')) || 0);
    this.queryChanges
      .pipe(
        debounceTime(250),
        switchMap(() => {
          this.loading = true;
          this.error = '';
          return this.observability
            .queryMetrics(this.context(), this.query || 'up', undefined, undefined, undefined, this.step)
            .pipe(finalize(() => (this.loading = false)));
        }),
        takeUntil(this.destroyed)
      )
      .subscribe({
        next: message => {
          if (message.code !== 0) {
            this.error = message.msg;
            return;
          }
          this.series = message.data?.series || [];
          this.rows = this.series.flatMap(series =>
            series.points.map(point => ({ timestamp: point.timestamp, value: point.value, labels: series.labels }))
          );
          const values = this.rows.map(row => row.value);
          const latest = this.rows.reduce<MetricTableRow | undefined>(
            (current, row) => (!current || row.timestamp > current.timestamp ? row : current),
            undefined
          );
          this.summary = {
            sampleCount: this.rows.length,
            minimum: values.length ? Math.min(...values) : 0,
            maximum: values.length ? Math.max(...values) : 0,
            latest: latest?.value || 0
          };
          this.chartOption = this.toChart(this.series);
          this.updateUrl();
        },
        error: error => (this.error = error?.error?.msg || error?.message || 'Storage unavailable')
      });
    this.loadInventory();
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

  selectMetric(name: string): void {
    this.query = name;
    this.search();
  }

  showSeries(series: MetricSeries): void {
    this.selectedSeries = series;
    this.detailVisible = true;
  }

  labelText(labels: Record<string, string>): string {
    return Object.entries(labels)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ');
  }

  navigationContext(): SignalContext & { refresh?: number } {
    return { ...this.context(), refresh: this.refreshSeconds || undefined };
  }

  private loadInventory(): void {
    this.observability
      .metricInventory(this.context())
      .pipe(takeUntil(this.destroyed))
      .subscribe({
        next: message => {
          this.metricNames = message.data?.metricNames || [];
          if (!this.query && this.metricNames.length) this.query = this.metricNames[0];
          this.search();
        },
        error: error => {
          this.error = error?.error?.msg || error?.message || 'Storage unavailable';
          this.search();
        }
      });
  }

  private context(): SignalContext {
    return {
      ...toSignalTimeContext(this.timeRange),
      serviceName: this.serviceName,
      serviceNamespace: this.serviceNamespace,
      environment: this.environment,
      operationName: this.operationName
    };
  }

  private updateUrl(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...this.context(), query: this.query || null, step: this.step, refresh: this.refreshSeconds || null },
      replaceUrl: true
    });
  }

  private toChart(series: MetricSeries[]): EChartsOption {
    return {
      animation: false,
      tooltip: { trigger: 'axis' },
      grid: { left: 52, right: 24, top: 24, bottom: 44 },
      xAxis: { type: 'time' },
      yAxis: { type: 'value', scale: true },
      dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 8 }],
      series: series.map((item, index) => ({
        name: this.labelText(item.labels) || `${this.query} ${index + 1}`,
        type: 'line',
        showSymbol: false,
        sampling: 'lttb',
        data: item.points.map(point => [point.timestamp, point.value])
      }))
    };
  }
}
