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

import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { throwError } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';

import { GrafanaDashboard } from '../../../pojo/GrafanaDashboard';
import { Message } from '../../../pojo/Message';
import { Monitor } from '../../../pojo/Monitor';
import { Param } from '../../../pojo/Param';
import { AppDefineService } from '../../../service/app-define.service';
import { MonitorService } from '../../../service/monitor.service';

@Component({
  selector: 'app-monitor-detail',
  templateUrl: './monitor-detail.component.html',
  styleUrls: ['./monitor-detail.component.less']
})
export class MonitorDetailComponent implements OnInit, OnDestroy {
  constructor(
    private monitorSvc: MonitorService,
    private route: ActivatedRoute,
    private notifySvc: NzNotificationService,
    private appDefineSvc: AppDefineService,
    private cdr: ChangeDetectorRef,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  isSpinning: boolean = false;
  monitorId!: number;
  app!: string;
  monitor: Monitor = new Monitor();
  grafanaDashboard: GrafanaDashboard = new GrafanaDashboard();
  options: any;
  port: number | undefined;
  metrics!: string[];
  chartMetrics: any[] = [];
  deadline = 90;
  countDownTime: number = 0;
  interval$!: any;
  whichTabIndex = 0;
  showBasic = true;

  ngOnInit(): void {
    this.countDownTime = this.deadline;
    this.loadRealTimeMetric();
    this.getGrafana();
  }

  loadMetricChart() {
    this.isSpinning = true;
    this.showBasic = false;
    this.whichTabIndex = 1;
    // detect if historical data service is available
    const detectStatus$ = this.monitorSvc
      .getWarehouseStorageServerStatus()
      .pipe(
        switchMap((message: Message<any>) => {
          if (message.code == 0) {
            // Filter the numerical metrics that can be aggregated under this monitor
            if (this.app == 'push') {
              return this.appDefineSvc.getPushDefine(this.monitorId);
            } else if (this.app == 'prometheus') {
              return this.appDefineSvc.getAppDynamicDefine(this.monitorId);
            } else {
              return this.appDefineSvc.getAppDefine(this.app);
            }
          } else {
            // historical data service is unavailable
            return throwError(message.msg);
          }
        })
      )
      .pipe(
        finalize(() => {
          detectStatus$.unsubscribe();
          this.isSpinning = false;
        })
      )
      .subscribe(
        message => {
          if (message.code === 0 && message.data != undefined) {
            this.chartMetrics = [];
            let metrics = message.data.metrics;
            metrics.forEach((metric: { name: any; fields: any; visible: boolean }) => {
              let fields = metric.fields;
              if (fields != undefined && metric.visible) {
                fields.forEach((field: { type: number; field: any; unit: any }) => {
                  if (field.type == 0) {
                    this.chartMetrics.push({
                      metrics: metric.name,
                      metric: field.field,
                      unit: field.unit
                    });
                    this.cdr.detectChanges();
                  }
                });
              }
            });
          } else {
            console.warn(message.msg);
          }
        },
        error => {
          this.notifySvc.warning(this.i18nSvc.fanyi('monitor.detail.time-series.unavailable'), error);
        }
      );
  }

  loadRealTimeMetric() {
    this.whichTabIndex = 0;
    this.isSpinning = true;
    this.route.paramMap
      .pipe(
        switchMap((paramMap: ParamMap) => {
          this.isSpinning = true;
          let id = paramMap.get('monitorId');
          this.monitorId = Number(id);
          return this.monitorSvc.getMonitor(this.monitorId);
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.monitor = message.data.monitor;
            this.app = this.monitor?.app;
            if (this.monitor.scrape && this.monitor.scrape != 'static') {
              this.app = this.monitor.scrape;
            }
            let params: Param[] = message.data.params;
            params.forEach(param => {
              if (param.field === 'port') {
                this.port = Number(param.paramValue);
              }
            });
            this.metrics = [];
            this.cdr.detectChanges();
            this.metrics = message.data.metrics;
            this.cdr.detectChanges();
          } else {
            console.warn(message.msg);
          }
          if (this.interval$ === undefined) {
            this.interval$ = setInterval(this.countDown.bind(this), 1000);
          }
          this.isSpinning = false;
        },
        error => {
          this.isSpinning = false;
          console.error(error.msg);
        }
      );
  }

  countDown() {
    if (this.deadline > 0) {
      this.countDownTime = Math.max(0, this.countDownTime - 1);
      this.cdr.detectChanges();
      if (this.countDownTime == 0) {
        if (this.whichTabIndex == 1) {
          this.loadMetricChart();
        } else {
          this.loadRealTimeMetric();
        }
        this.countDownTime = this.deadline;
        this.cdr.detectChanges();
      }
    }
  }

  refreshMetrics() {
    if (this.whichTabIndex == 1) {
      this.loadMetricChart();
    } else {
      this.loadRealTimeMetric();
    }
    this.countDownTime = this.deadline;
    this.cdr.detectChanges();
  }

  configRefreshDeadline(deadlineTime: number) {
    this.deadline = deadlineTime;
    this.countDownTime = this.deadline;
    this.cdr.detectChanges();
  }

  getGrafana() {
    this.monitorSvc.getGrafanaDashboard(this.monitorId).subscribe(
      message => {
        if (message.code === 0 && message.data != null) {
          this.grafanaDashboard = message.data;
        }
      },
      error => {
        console.error(error.msg);
      }
    );
  }

  ngOnDestroy(): void {
    clearInterval(this.interval$);
  }
}
