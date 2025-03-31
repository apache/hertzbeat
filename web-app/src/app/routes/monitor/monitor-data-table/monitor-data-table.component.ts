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

import { Component, Input, OnInit } from '@angular/core';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs/operators';

import { MonitorService } from '../../../service/monitor.service';

@Component({
  selector: 'app-monitor-data-table',
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

  showModal!: boolean;
  time!: any;
  fields!: any[];
  valueRows!: any[];
  rowValues!: any[];
  isTable: boolean = true;
  scrollY: string = '100%';
  loading: boolean = false;

  constructor(private monitorSvc: MonitorService, private notifySvc: NzNotificationService) {}

  ngOnInit(): void {
    this.scrollY = `calc(${this.height} - 130px)`;
  }

  loadData() {
    this.loading = true;
    // Read real-time metrics data
    let metricData$ = this.monitorSvc
      .getMonitorMetricsData(this.monitorId, this.metrics)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe(
        message => {
          metricData$.unsubscribe();
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
          metricData$.unsubscribe();
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
}
