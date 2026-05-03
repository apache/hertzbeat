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

import { formatDate } from '@angular/common';
import { Inject, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs/operators';

import { MonitorService } from '../../../service/monitor.service';
import { PlatformFactsStripItem } from '../../../shared/components/platform-facts-strip/platform-facts-strip.component';
import { PlatformSummaryMetricGridItem } from '../../../shared/components/platform-summary-metric-grid/platform-summary-metric-grid.component';

@Component({
  standalone: false,  selector: 'app-monitor-data-table',
  templateUrl: './monitor-data-table.component.html',
  styleUrls: ['./monitor-data-table.component.less']
})
export class MonitorDataTableComponent implements OnInit {
  @Input()
  get monitorId(): number {
    return this._monitorId;
  }
  set monitorId(monitorId: number) {
    this._monitorId = monitorId;
    if (this._monitorId && this.metrics) {
      // Make sure the monitorId is the last input parameter
      // So that other input parameters are filled in before loadData is executed
      this.loadData();
    }
  }
  private _monitorId!: number;
  @Input()
  app!: string;
  @Input()
  port!: number | undefined;
  @Input()
  monitor!: any;
  @Input()
  metrics!: string;
  @Input()
  height: string = '100%';
  @Input()
  favoriteStatus: boolean = false;
  @Input()
  card: boolean = true;
  @Output()
  readonly favoriteToggle = new EventEmitter<string>();

  showModal!: boolean;
  time!: any;
  fields!: any[];
  valueRows!: any[];
  rowValues!: any[];
  isTable: boolean = true;
  scrollY: string = '100%';
  loading: boolean = false;

  constructor(
    private monitorSvc: MonitorService,
    private notifySvc: NzNotificationService,
    @Inject(ALAIN_I18N_TOKEN) private i18n: I18NService
  ) {}

  ngOnInit(): void {
    this.scrollY = `calc(${this.height} - 130px)`;
  }

  loadData() {
    this.loading = true;
    // Read real-time metrics data
    this.monitorSvc
      .getMonitorMetricsData(this.monitorId, this.metrics)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe(
        message => {
          if (message.code === 0 && message.data) {
            this.time = message.data.time;
            this.fields = message.data.fields;
            this.valueRows = message.data.valueRows;
            if (this.valueRows.length == 1) {
              this.isTable = false;
              this.rowValues = this.valueRows[0].values;
            }
          } else if (message.code !== 0) {
            this.notifySvc.warning(`${this.metrics}:${message.msg}`, '');
            console.info(`${this.metrics}:${message.msg}`);
          }
        },
        error => {
          console.error(error.msg);
        }
      );
  }

  getObjectLength(obj: Record<string, string> | undefined): number {
    if (!obj) return 0;
    return Object.keys(obj).length;
  }

  getObjectEntries(obj: Record<string, string> | undefined): Array<[string, string]> {
    if (!obj) return [];
    return Object.entries(obj);
  }

  toggleFavorite() {
    if (this.metrics) {
      this.favoriteToggle.emit(this.metrics);
    }
  }

  isFavorite(): boolean {
    return this.favoriteStatus;
  }

  translateMetricLabel(fieldName: string): string {
    const key = `monitor.app.${this.app}.metrics.${this.metrics}.metric.${fieldName}`;
    const translated = this.i18n.fanyi(key);
    return translated === key ? fieldName : translated;
  }

  translateMetricTitle(): string {
    const key = `monitor.app.${this.app}.metrics.${this.metrics}`;
    const translated = this.i18n.fanyi(key);
    return translated === key ? this.metrics : translated;
  }

  get workbenchKicker(): string {
    return this.monitor ? this.i18n.fanyi('monitor.detail.table.kicker.monitor') : this.i18n.fanyi('monitor.detail.table.kicker.metric');
  }

  get workbenchTitle(): string {
    return this.monitor ? this.i18n.fanyi('monitor.detail.basic') : this.translateMetricTitle();
  }

  get workbenchCopy(): string {
    if (this.monitor) {
      const instance = this.monitor?.instance || '-';
      return this.i18n.fanyi('monitor.detail.table.copy.monitor').replace('{{instance}}', instance);
    }
    return this.i18n.fanyi('monitor.detail.table.copy.metric').replace('{{metric}}', this.translateMetricTitle());
  }

  get sourceBadge(): string {
    return this.i18n.fanyi('monitor.detail.chart.source.badge');
  }

  get workbenchSummaryItems(): Array<{ label: string; value: string }> {
    if (this.monitor) {
      return [
        {
          label: this.i18n.fanyi('monitor.detail.table.summary.status'),
          value: this.monitorStatusLabel(this.monitor?.status)
        },
        {
          label: this.i18n.fanyi('monitor.detail.table.summary.labels'),
          value: String(this.getObjectLength(this.monitor?.labels))
        },
        {
          label: this.i18n.fanyi('monitor.detail.table.summary.annotations'),
          value: String(this.getObjectLength(this.monitor?.annotations))
        }
      ];
    }
    return [
      {
        label: this.i18n.fanyi('monitor.detail.table.summary.fields'),
        value: String(this.fields?.length || 0)
      },
      {
        label: this.i18n.fanyi('monitor.detail.table.summary.samples'),
        value: String(this.valueRows?.length || 0)
      },
      {
        label: this.i18n.fanyi('monitor.detail.table.summary.latest'),
        value: this.time ? formatDate(this.time, 'HH:mm:ss', 'en-US') : this.i18n.fanyi('common.empty')
      }
    ];
  }

  get workbenchSummaryFactItems(): PlatformFactsStripItem[] {
    return this.workbenchSummaryItems.map((item, index) => ({
      ...item,
      tone: this.monitor
        ? index === 0
          ? 'accent'
          : 'default'
        : index === 0
        ? 'accent'
        : index === 2
        ? 'success'
        : 'default'
    }));
  }

  get metricSnapshotItems(): Array<{ label: string; value: string }> {
    if (this.monitor || !this.fields?.length) {
      return [];
    }
    const sampleValues = this.resolveLatestSampleValues();
    if (sampleValues.length === 0) {
      return [];
    }
    return this.fields.slice(0, 3).map((field, index) => ({
      label: this.translateMetricLabel(field.name),
      value: this.formatMetricSnapshotValue(sampleValues[index]?.origin, field.unit)
    }));
  }

  get metricSnapshotMetricItems(): PlatformSummaryMetricGridItem[] {
    return this.metricSnapshotItems.map((item, index) => ({
      ...item,
      tone: index === 0 ? 'accent' : 'default'
    }));
  }

  private monitorStatusLabel(status?: number): string {
    switch (status) {
      case 1:
        return this.i18n.fanyi('monitor.status.up');
      case 2:
        return this.i18n.fanyi('monitor.status.down');
      case 0:
      default:
        return this.i18n.fanyi('monitor.status.paused');
    }
  }

  private resolveLatestSampleValues(): any[] {
    if (!this.isTable && Array.isArray(this.rowValues)) {
      return this.rowValues;
    }
    if (!Array.isArray(this.valueRows) || this.valueRows.length === 0) {
      return [];
    }
    return this.valueRows[this.valueRows.length - 1]?.values || [];
  }

  private formatMetricSnapshotValue(origin: any, unit?: string): string {
    if (origin == null || origin === '') {
      return this.i18n.fanyi('common.empty');
    }
    const value = `${origin}`;
    return unit ? `${value} ${unit}` : value;
  }
}
