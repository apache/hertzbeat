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
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { SharedModule } from '@shared';
import { EChartsOption } from 'echarts';
import { NgxEchartsModule } from 'ngx-echarts';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { Subscription } from 'rxjs';

import { OpsWorkspaceFacade } from '../../../core/ops-workspace/ops-workspace.facade';
import {
  OtlpMetricsConsole,
  OtlpMetricsConsoleQueryParams,
  OtlpMetricsFrame
} from '../../../pojo/OtlpIngestion';
import { ThemeService } from '../../../service/theme.service';
import { OtlpIngestionService } from '../../../service/otlp-ingestion.service';
import { PageShellComponent } from '../../../shared/components/page-shell/page-shell.component';
import { PlatformFactsStripItem } from '../../../shared/components/platform-facts-strip/platform-facts-strip.component';
import { PlatformStageMetaChipItem } from '../../../shared/components/platform-stage-meta-header/platform-stage-meta-header.component';
import { createObservabilityChartOption, resolveObservabilityThemeMode } from '../../../shared/observability/observability-theme';

interface MetricSeriesView {
  name: string;
  labels: Record<string, string>;
  points: Array<[number, number | null]>;
  latestValue?: number | null;
}

@Component({
  selector: 'app-otlp-metrics-console',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    PageShellComponent,
    NgxEchartsModule,
    NzButtonModule,
    NzDatePickerModule,
    NzEmptyModule,
    NzIconModule,
    NzInputModule,
    NzSpinModule,
    NzTagModule
  ],
  templateUrl: './otlp-metrics-console.component.html',
  styleUrl: './otlp-metrics-console.component.less'
})
export class OtlpMetricsConsoleComponent implements OnInit, OnDestroy {
  loading = false;
  loadFailed = false;
  timeRange: Date[] = [];
  query = '';
  groupBy = '__name__';
  aggregation = 'sum';
  serviceName = '';
  serviceNamespace = '';
  environment = '';
  entityIdContext?: string;
  entityNameContext?: string;
  returnTo?: string;
  returnLabel?: string;
  consoleData = new OtlpMetricsConsole();
  metricSeries: MetricSeriesView[] = [];
  chartOption: EChartsOption = {};

  private queryParamSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private otlpIngestionSvc: OtlpIngestionService,
    @Inject(ALAIN_I18N_TOKEN) private i18n: I18NService,
    private opsWorkspace: OpsWorkspaceFacade,
    private themeSvc: ThemeService
  ) {}

  ngOnInit(): void {
    this.queryParamSub = this.route.queryParams.subscribe(params => {
      this.readQueryParams(params);
      this.syncWorkspaceContext(params);
      this.loadConsole();
    });
  }

  ngOnDestroy(): void {
    this.queryParamSub?.unsubscribe();
  }

  get hasEntityContext(): boolean {
    return this.entityIdContext != null && this.entityNameContext != null;
  }

  get hasData(): boolean {
    return this.metricSeries.length > 0;
  }

  get consoleShellSubtitle(): string {
    if (this.hasEntityContext) {
      return `${this.entityNameContext} · ${this.i18n.fanyi('ingestion.otlp.metrics.subtitle.entity')}`;
    }
    return this.i18n.fanyi('ingestion.otlp.metrics.subtitle');
  }

  get activeFilterCount(): number {
    return [
      this.query,
      this.serviceName,
      this.serviceNamespace,
      this.environment,
      this.timeRange.length === 2 ? 'range' : ''
    ].filter(value => `${value}`.trim() !== '').length;
  }

  get latestObservedAt(): number | null | undefined {
    return this.consoleData.stats.latestObservedAt ?? this.consoleData.context.end;
  }

  get metricsQueryStageMetaChips(): PlatformStageMetaChipItem[] {
    return [
      {
        text: `${this.i18n.fanyi('ingestion.otlp.metrics.result.filters')} · ${this.activeFilterCount}`,
        tone: this.activeFilterCount > 0 ? 'accent' : 'default'
      }
    ];
  }

  get metricsChartStageMetaChips(): PlatformStageMetaChipItem[] {
    return [
      {
        text: `${this.i18n.fanyi('ingestion.otlp.metrics.result.datasource')} · ${this.consoleData.datasource || '-'}`,
        tone: 'accent'
      },
      {
        text: `${this.i18n.fanyi('ingestion.otlp.metrics.result.series')} · ${this.consoleData.stats.nonEmptySeries || 0}`,
        tone: 'success'
      }
    ];
  }

  get metricsConsoleFacts(): PlatformFactsStripItem[] {
    return [
      {
        label: this.i18n.fanyi('ingestion.otlp.metrics.result.series'),
        value: `${this.consoleData.stats.totalSeries || 0}`,
        tone: 'accent'
      },
      {
        label: this.i18n.fanyi('ingestion.otlp.metrics.result.non-empty'),
        value: `${this.consoleData.stats.nonEmptySeries || 0}`,
        tone: 'success'
      },
      {
        label: this.i18n.fanyi('ingestion.otlp.metrics.result.filters'),
        value: `${this.activeFilterCount}`,
        tone: this.activeFilterCount > 0 ? 'warning' : 'default'
      },
      {
        label: this.i18n.fanyi('ingestion.otlp.metrics.result.datasource'),
        value: this.consoleData.datasource || '-',
        tone: 'accent'
      }
    ];
  }

  runQuery(): void {
    this.loadConsole();
  }

  resetQuery(): void {
    this.query = '';
    this.groupBy = '__name__';
    this.aggregation = 'sum';
    this.loadConsole();
  }

  openLogConsole(): void {
    this.router.navigate(['/log/manage'], {
      queryParams: this.buildSignalConsoleQueryParams()
    });
  }

  openTraceConsole(): void {
    this.router.navigate(['/trace/manage'], {
      queryParams: this.buildSignalConsoleQueryParams()
    });
  }

  openOtlpCenter(): void {
    this.router.navigate(['/ingestion/otlp'], {
      queryParams: this.compactQueryParams({
        signal: 'metrics',
        returnTo: '/ingestion/otlp/metrics',
        returnLabel: this.i18n.fanyi('ingestion.otlp.metrics.title')
      })
    });
  }

  returnToEntity(): void {
    if (!this.hasEntityContext) {
      return;
    }
    this.router.navigate(['/entities', this.entityIdContext], {
      queryParams: this.compactQueryParams({
        returnTo: this.returnTo,
        returnLabel: this.returnLabel
      })
    });
  }

  private loadConsole(): void {
    this.loading = true;
    this.loadFailed = false;
    const [start, end] = this.resolveTimeRange();
    const params: OtlpMetricsConsoleQueryParams = {
      entityId: this.entityIdContext,
      serviceName: this.trimText(this.serviceName),
      serviceNamespace: this.trimText(this.serviceNamespace),
      environment: this.trimText(this.environment),
      start,
      end,
      query: this.trimText(this.query),
      groupBy: this.trimText(this.groupBy),
      aggregation: this.trimText(this.aggregation)
    };
    this.otlpIngestionSvc.getMetricsConsole(params).subscribe({
      next: message => {
        this.loading = false;
        if (message.code !== 0 || message.data == null) {
          this.loadFailed = true;
          this.consoleData = new OtlpMetricsConsole();
          this.metricSeries = [];
          this.chartOption = {};
          return;
        }
        this.consoleData = message.data;
        this.query = message.data.query || this.query;
        this.metricSeries = this.buildMetricSeries(message.data.results?.frames || []);
        this.chartOption = this.buildChartOption(this.metricSeries);
      },
      error: () => {
        this.loading = false;
        this.loadFailed = true;
        this.consoleData = new OtlpMetricsConsole();
        this.metricSeries = [];
        this.chartOption = {};
      }
    });
  }

  private buildMetricSeries(frames: OtlpMetricsFrame[]): MetricSeriesView[] {
    return (frames || [])
      .map(frame => {
        const name = frame?.schema?.labels?.['__name__'] || this.i18n.fanyi('ingestion.otlp.metrics.series.unknown');
        const points = (frame?.data || []).map(row => {
          const timestamp = Number(row?.[0]);
          const value = row?.[1] == null || row?.[1] === '' ? null : Number(row[1]);
          return [timestamp, Number.isFinite(value as number) ? (value as number) : null] as [number, number | null];
        });
        return {
          name,
          labels: frame?.schema?.labels || {},
          points,
          latestValue: points.length > 0 ? points[points.length - 1][1] : null
        };
      })
      .filter(series => series.points.length > 0);
  }

  private buildChartOption(seriesList: MetricSeriesView[]): EChartsOption {
    return createObservabilityChartOption(resolveObservabilityThemeMode(this.themeSvc.getTheme()), 'metrics-timeseries', {
      kind: 'timeseries',
      legend: seriesList.slice(0, 6).map(series => series.name),
      series: seriesList.slice(0, 6).map(series => ({
        name: series.name,
        type: 'line',
        data: series.points.map(point => [point[0], point[1] == null ? Number.NaN : point[1]])
      }))
    });
  }

  private readQueryParams(params: Record<string, unknown>): void {
    this.entityIdContext = this.trimText(params['entityId']);
    this.entityNameContext = this.trimText(params['entityName']);
    this.serviceName = this.trimText(params['serviceName']) || '';
    this.serviceNamespace = this.trimText(params['serviceNamespace']) || '';
    this.environment = this.trimText(params['environment']) || '';
    this.query = this.trimText(params['query']) || '';
    this.groupBy = this.trimText(params['groupBy']) || '__name__';
    this.aggregation = this.trimText(params['aggregation']) || 'sum';
    this.returnTo = this.trimText(params['returnTo']);
    this.returnLabel = this.trimText(params['returnLabel']);
    const start = this.toMillis(params['start']);
    const end = this.toMillis(params['end']);
    if (start != null && end != null && end > start) {
      this.timeRange = [new Date(start), new Date(end)];
      return;
    }
    const sharedRange = this.opsWorkspace.timeRange();
    this.timeRange = [new Date(sharedRange.start), new Date(sharedRange.end)];
  }

  private resolveTimeRange(): [number, number] {
    if (this.timeRange.length === 2) {
      return [this.timeRange[0].getTime(), this.timeRange[1].getTime()];
    }
    const sharedRange = this.opsWorkspace.timeRange();
    this.timeRange = [new Date(sharedRange.start), new Date(sharedRange.end)];
    return [sharedRange.start, sharedRange.end];
  }

  private syncWorkspaceContext(params: Record<string, unknown>): void {
    const [start, end] = this.resolveTimeRange();
    this.opsWorkspace.setCustomTimeRange(start, end, this.i18n.fanyi('ingestion.otlp.metrics.time-range.label'));
    this.opsWorkspace.setSelectedEntity(
      this.entityIdContext != null && this.entityNameContext != null
        ? {
            id: this.entityIdContext,
            name: this.entityNameContext,
            type: 'entity'
          }
        : null
    );
    this.opsWorkspace.setQueryContext({
      route: '/ingestion/otlp/metrics',
      params: this.compactQueryParams({
        ...params,
        entityId: this.entityIdContext,
        entityName: this.entityNameContext,
        serviceName: this.serviceName,
        serviceNamespace: this.serviceNamespace,
        environment: this.environment,
        start,
        end
      })
    });
  }

  private buildSignalConsoleQueryParams(): Record<string, string> {
    const [start, end] = this.resolveTimeRange();
    return this.compactQueryParams({
      entityId: this.entityIdContext,
      entityName: this.entityNameContext,
      serviceName: this.serviceName || this.consoleData.context.serviceName,
      serviceNamespace: this.serviceNamespace || this.consoleData.context.serviceNamespace,
      environment: this.environment || this.consoleData.context.environment,
      start,
      end,
      returnTo: '/ingestion/otlp/metrics',
      returnLabel: this.i18n.fanyi('ingestion.otlp.metrics.title')
    });
  }

  private compactQueryParams(input: Record<string, unknown>): Record<string, string> {
    return Object.entries(input).reduce<Record<string, string>>((params, [key, value]) => {
      if (value == null || value === '') {
        return params;
      }
      params[key] = `${value}`;
      return params;
    }, {});
  }

  private trimText(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  private toMillis(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }
}
