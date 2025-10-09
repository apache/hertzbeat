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
import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { SharedModule } from '@shared';
import { EChartsOption } from 'echarts';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService, NzModalModule } from 'ng-zorro-antd/modal';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NgxEchartsModule } from 'ngx-echarts';

import { LogEntry } from '../../../pojo/LogEntry';
import { LogService } from '../../../service/log.service';

@Component({
  selector: 'app-log-manage',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    NzCardModule,
    NzTableModule,
    NzDatePickerModule,
    NzInputModule,
    NzButtonModule,
    NzTagModule,
    NzToolTipModule,
    NzEmptyModule,
    NgxEchartsModule,
    NzStatisticModule,
    NzSpaceModule,
    NzIconModule,
    NzDividerModule,
    NzCollapseModule,
    NzModalModule,
    NzCheckboxModule,
    NzPopoverModule,
    NzListModule,
    NzAutocompleteModule
  ],
  templateUrl: './log-manage.component.html',
  styleUrl: './log-manage.component.less'
})
export class LogManageComponent implements OnInit {
  constructor(
    private logSvc: LogService,
    private msg: NzMessageService,
    private modal: NzModalService,
    @Inject(ALAIN_I18N_TOKEN) private i18n: I18NService
  ) {}

  // filters
  timeRange: Date[] = [];
  severityNumber?: number;
  severityText?: string;
  traceId: string = '';
  spanId: string = '';

  // table with pagination
  loading = false;
  data: LogEntry[] = [];
  pageIndex = 1;
  pageSize = 20;
  totalElements = 0;
  totalPages = 0;

  // charts
  severityOption!: EChartsOption;
  trendOption!: EChartsOption;
  traceCoverageOption!: EChartsOption;
  severityInstance: any;
  trendInstance: any;
  traceCoverageInstance: any;

  // Modal state
  isModalVisible: boolean = false;
  selectedLogEntry: LogEntry | null = null;

  // Statistics visibility control
  showStatistics: boolean = false;

  // Batch selection for table
  checked = false;
  indeterminate = false;
  setOfCheckedId = new Set<string>();

  // overview stats
  overviewStats: any = {
    totalCount: 0,
    fatalCount: 0,
    errorCount: 0,
    warnCount: 0,
    infoCount: 0,
    debugCount: 0,
    traceCount: 0
  };

  // column visibility
  columnVisibility = {
    time: { visible: true, label: this.i18n.fanyi('log.manage.table.column.time') },
    observedTime: { visible: true, label: this.i18n.fanyi('log.manage.table.column.observed-time') },
    severity: { visible: true, label: this.i18n.fanyi('log.manage.table.column.severity') },
    body: { visible: true, label: this.i18n.fanyi('log.manage.table.column.body') },
    attributes: { visible: true, label: this.i18n.fanyi('log.manage.table.column.attributes') },
    resource: { visible: true, label: this.i18n.fanyi('log.manage.table.column.resource') },
    traceId: { visible: true, label: this.i18n.fanyi('log.manage.table.column.trace-id') },
    spanId: { visible: true, label: this.i18n.fanyi('log.manage.table.column.span-id') },
    traceFlags: { visible: true, label: this.i18n.fanyi('log.manage.table.column.trace-flags') },
    instrumentation: { visible: true, label: this.i18n.fanyi('log.manage.table.column.instrumentation') },
    droppedCount: { visible: true, label: this.i18n.fanyi('log.manage.table.column.dropped-count') }
  };

  // column control visible
  columnControlVisible = false;

  ngOnInit(): void {
    this.initChartThemes();
  }

  initChartThemes() {
    this.severityOption = {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'] },
      yAxis: { type: 'value' },
      series: [
        {
          type: 'bar',
          data: [0, 0, 0, 0, 0, 0],
          itemStyle: {
            color: function (params: any) {
              const colors = ['#d9d9d9', '#52c41a', '#1890ff', '#faad14', '#ff4d4f', '#722ed1'];
              return colors[params.dataIndex];
            }
          }
        }
      ]
    };

    this.trendOption = {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: [] },
      yAxis: { type: 'value' },
      series: [
        {
          type: 'line',
          data: [],
          smooth: true,
          areaStyle: { opacity: 0.3 }
        }
      ]
    };

    this.traceCoverageOption = {
      tooltip: { trigger: 'item', formatter: '{b}: {c}' },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          data: [
            { name: this.i18n.fanyi('log.manage.chart.trace-coverage.with-trace'), value: 0, itemStyle: { color: '#52c41a' } },
            { name: this.i18n.fanyi('log.manage.chart.trace-coverage.without-trace'), value: 0, itemStyle: { color: '#ff4d4f' } },
            { name: this.i18n.fanyi('log.manage.chart.trace-coverage.with-span'), value: 0, itemStyle: { color: '#1890ff' } },
            { name: this.i18n.fanyi('log.manage.chart.trace-coverage.complete-trace-info'), value: 0, itemStyle: { color: '#722ed1' } }
          ],
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    };
  }

  onSeverityChartInit(ec: any) {
    this.severityInstance = ec;
  }
  onTrendChartInit(ec: any) {
    this.trendInstance = ec;
  }
  onTraceCoverageChartInit(ec: any) {
    this.traceCoverageInstance = ec;
  }

  refreshSeverityChartFromOverview(overviewStats: any) {
    const traceCount = overviewStats.traceCount || 0;
    const debugCount = overviewStats.debugCount || 0;
    const infoCount = overviewStats.infoCount || 0;
    const warnCount = overviewStats.warnCount || 0;
    const errorCount = overviewStats.errorCount || 0;
    const fatalCount = overviewStats.fatalCount || 0;

    const data = [traceCount, debugCount, infoCount, warnCount, errorCount, fatalCount];
    const option: EChartsOption = {
      ...this.severityOption,
      series: [
        {
          ...(this.severityOption.series as any)?.[0],
          data
        }
      ]
    };
    this.severityOption = option;
    if (this.severityInstance) this.severityInstance.setOption(option);
  }

  refreshTrendChart(hourlyStats: Record<string, number>) {
    const sortedHours = Object.keys(hourlyStats).sort();
    const data = sortedHours.map(hour => hourlyStats[hour]);
    const option: EChartsOption = {
      ...this.trendOption,
      xAxis: {
        type: 'category',
        data: sortedHours
      },
      series: [{ ...(this.trendOption.series as any)?.[0], data }]
    };
    this.trendOption = option;
    if (this.trendInstance) this.trendInstance.setOption(option);
  }

  refreshTraceCoverageChart(traceCoverageData: any) {
    const coverage = traceCoverageData.traceCoverage || {};
    const data = [
      {
        name: this.i18n.fanyi('log.manage.chart.trace-coverage.with-trace'),
        value: coverage.withTrace || 0,
        itemStyle: { color: '#52c41a' }
      },
      {
        name: this.i18n.fanyi('log.manage.chart.trace-coverage.without-trace'),
        value: coverage.withoutTrace || 0,
        itemStyle: { color: '#ff4d4f' }
      },
      {
        name: this.i18n.fanyi('log.manage.chart.trace-coverage.with-span'),
        value: coverage.withSpan || 0,
        itemStyle: { color: '#1890ff' }
      },
      {
        name: this.i18n.fanyi('log.manage.chart.trace-coverage.complete-trace-info'),
        value: coverage.withBothTraceAndSpan || 0,
        itemStyle: { color: '#722ed1' }
      }
    ];
    const option: EChartsOption = {
      ...this.traceCoverageOption,
      series: [{ ...(this.traceCoverageOption.series as any)?.[0], data }]
    };
    this.traceCoverageOption = option;
    if (this.traceCoverageInstance) this.traceCoverageInstance.setOption(option);
  }

  query() {
    this.loading = true;
    const start = this.timeRange?.[0]?.getTime();
    const end = this.timeRange?.[1]?.getTime();

    const obs = this.logSvc.list(
      start,
      end,
      this.traceId,
      this.spanId,
      this.severityNumber,
      this.severityText,
      this.pageIndex - 1,
      this.pageSize
    );

    obs.subscribe({
      next: message => {
        if (message.code === 0) {
          const pageData = message.data;
          this.data = pageData.content;
          this.totalElements = pageData.totalElements;
          this.totalPages = pageData.totalPages;
          this.pageIndex = pageData.number + 1;

          // Clear selection when data changes
          this.setOfCheckedId.clear();
          this.refreshCheckedStatus();

          this.loadStatsWithFilters();
        } else {
          this.msg.warning(this.i18n.fanyi('log.manage.error.unsupported-db'));
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.msg.error(this.i18n.fanyi('common.notify.query-fail'));
      }
    });
  }

  loadStatsWithFilters() {
    const start = this.timeRange?.[0]?.getTime();
    const end = this.timeRange?.[1]?.getTime();
    const traceId = this.traceId || undefined;
    const spanId = this.spanId || undefined;
    const severity = this.severityNumber || undefined;
    const severityText = this.severityText || undefined;

    this.logSvc.overviewStats(start, end, traceId, spanId, severity, severityText).subscribe({
      next: message => {
        if (message.code === 0) {
          this.overviewStats = message.data || {};
          this.refreshSeverityChartFromOverview(this.overviewStats);
        }
      }
    });

    this.logSvc.traceCoverageStats(start, end, traceId, spanId, severity, severityText).subscribe({
      next: message => {
        if (message.code === 0) {
          this.refreshTraceCoverageChart(message.data || {});
        }
      }
    });

    this.logSvc.trendStats(start, end, traceId, spanId, severity, severityText).subscribe({
      next: message => {
        if (message.code === 0) {
          this.refreshTrendChart(message.data?.hourlyStats || {});
        }
      }
    });
  }

  clearFilters() {
    this.timeRange = [];
    this.severityNumber = undefined;
    this.traceId = '';
    this.spanId = '';
    this.severityText = '';
    this.pageIndex = 1;
    this.query();
  }

  toggleStatistics() {
    this.showStatistics = !this.showStatistics;
  }

  // Batch selection methods
  updateCheckedSet(id: string, checked: boolean): void {
    if (checked) {
      this.setOfCheckedId.add(id);
    } else {
      this.setOfCheckedId.delete(id);
    }
  }

  onItemChecked(id: string, checked: boolean): void {
    this.updateCheckedSet(id, checked);
    this.refreshCheckedStatus();
  }

  onAllChecked(checked: boolean): void {
    this.data.forEach(item => this.updateCheckedSet(this.getLogId(item), checked));
    this.refreshCheckedStatus();
  }

  refreshCheckedStatus(): void {
    this.checked = this.data.every(item => this.setOfCheckedId.has(this.getLogId(item)));
    this.indeterminate = this.data.some(item => this.setOfCheckedId.has(this.getLogId(item))) && !this.checked;
  }

  getLogId(item: LogEntry): string {
    return `${item.timeUnixNano}_${item.traceId || 'no-trace'}`;
  }

  batchDelete(): void {
    if (this.setOfCheckedId.size === 0) {
      this.msg.warning(this.i18n.fanyi('common.notify.no-select-delete'));
      return;
    }

    const selectedItems = this.data.filter(item => this.setOfCheckedId.has(this.getLogId(item)));

    this.modal.confirm({
      nzTitle: this.i18n.fanyi('common.confirm.delete-batch'),
      nzOkText: this.i18n.fanyi('common.button.delete'),
      nzOkDanger: true,
      nzCancelText: this.i18n.fanyi('common.button.cancel'),
      nzOnOk: () => {
        this.performBatchDelete(selectedItems);
      }
    });
  }

  performBatchDelete(selectedItems: LogEntry[]): void {
    const timeUnixNanos = selectedItems.filter(item => item.timeUnixNano != null).map(item => item.timeUnixNano!);

    if (timeUnixNanos.length === 0) {
      this.msg.warning(this.i18n.fanyi('common.notify.no-select-delete'));
      return;
    }

    this.logSvc.batchDelete(timeUnixNanos).subscribe({
      next: message => {
        if (message.code === 0) {
          this.msg.success(this.i18n.fanyi('common.notify.delete-success'));
          this.setOfCheckedId.clear();
          this.refreshCheckedStatus();
          this.query();
        } else {
          this.msg.error(message.msg || this.i18n.fanyi('common.notify.delete-fail'));
        }
      },
      error: () => {
        this.msg.error(this.i18n.fanyi('common.notify.delete-fail'));
      }
    });
  }

  onTablePageChange(params: { pageIndex: number; pageSize: number; sort: any; filter: any }) {
    this.pageIndex = params.pageIndex;
    this.pageSize = params.pageSize;
    this.query();
  }

  getSeverityColor(severityNumber?: number): string {
    if (!severityNumber) return 'default';
    if (severityNumber >= 21 && severityNumber <= 24) return 'purple'; // FATAL
    if (severityNumber >= 17 && severityNumber <= 20) return 'red'; // ERROR
    if (severityNumber >= 13 && severityNumber <= 16) return 'orange'; // WARN
    if (severityNumber >= 9 && severityNumber <= 12) return 'blue'; // INFO
    if (severityNumber >= 5 && severityNumber <= 8) return 'green'; // DEBUG
    if (severityNumber >= 1 && severityNumber <= 4) return 'default'; // TRACE
    return 'default';
  }

  getBodyText(body: any): string {
    if (!body) return '';
    if (typeof body === 'string') return body.length > 100 ? `${body.substring(0, 100)}...` : body;
    if (typeof body === 'object') {
      const str = JSON.stringify(body);
      return str.length > 100 ? `${str.substring(0, 100)}...` : str;
    }
    return String(body);
  }

  getObjectText(obj: any): string {
    if (!obj) return '';
    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      if (keys.length === 0) return '';
      if (keys.length === 1) {
        return `${keys[0]}: ${obj[keys[0]]}`;
      }
      return `${keys[0]}: ${obj[keys[0]]} (+${keys.length - 1} more)`;
    }
    return String(obj);
  }

  getInstrumentationText(scope: any): string {
    if (!scope) return '';
    const parts = [];
    if (scope.name) parts.push(`Name: ${scope.name}`);
    if (scope.version) parts.push(`Version: ${scope.version}`);
    if (scope.attributes && Object.keys(scope.attributes).length > 0) {
      parts.push(`Attributes: ${Object.keys(scope.attributes).length} items`);
    }
    return parts.join('\n');
  }

  // Modal methods
  showLogDetails(logEntry: LogEntry): void {
    this.selectedLogEntry = logEntry;
    this.isModalVisible = true;
  }

  handleModalCancel(): void {
    this.isModalVisible = false;
    this.selectedLogEntry = null;
  }

  getLogEntryJson(logEntry: LogEntry): string {
    return JSON.stringify(logEntry, null, 2);
  }

  formatTimestamp(timeUnixNano: number | undefined): string {
    if (!timeUnixNano) return '';
    return new Date(timeUnixNano / 1000000).toLocaleString();
  }

  copyToClipboard(text: string): void {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        this.msg.success(this.i18n.fanyi('common.notify.copy-success'));
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        this.msg.error(this.i18n.fanyi('common.notify.copy-fail'));
      });
  }

  toggleColumnVisibility(column: string): void {
    if (this.columnVisibility[column as keyof typeof this.columnVisibility]) {
      this.columnVisibility[column as keyof typeof this.columnVisibility].visible =
        !this.columnVisibility[column as keyof typeof this.columnVisibility].visible;
    }
  }

  getVisibleColumnsCount(): number {
    return Object.values(this.columnVisibility).filter(col => col.visible).length;
  }

  getColumnKeys(): string[] {
    return Object.keys(this.columnVisibility);
  }

  getColumnVisibility(): any {
    return this.columnVisibility;
  }

  resetColumns(): void {
    Object.keys(this.columnVisibility).forEach(key => {
      this.columnVisibility[key as keyof typeof this.columnVisibility].visible = true;
    });
    this.msg.success(this.i18n.fanyi('common.notify.operate-success'));
  }

  toggleColumnControl(): void {
    this.columnControlVisible = !this.columnControlVisible;
  }
}
