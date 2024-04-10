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

import { Component, Input } from '@angular/core';
import { NzNotificationService } from 'ng-zorro-antd/notification';

import { MonitorService } from '../../../service/monitor.service';

@Component({
  selector: 'app-monitor-data-table',
  templateUrl: './monitor-data-table.component.html',
  styleUrls: ['./monitor-data-table.component.less']
})
export class MonitorDataTableComponent {
  @Input()
  get monitorId(): number {
    return this._monitorId;
  }
  set monitorId(monitorId: number) {
    this._monitorId = monitorId;
    // 需将monitorId作为输入参数的最后一个  这样在执行loadData时其它入参才有值
    this.loadData();
  }
  private _monitorId!: number;
  @Input()
  app!: string;
  @Input()
  metrics!: string;

  time!: any;
  fields!: any[];
  valueRows!: any[];
  rowValues!: any[];
  isTable: boolean = true;

  constructor(private monitorSvc: MonitorService, private notifySvc: NzNotificationService) {}

  loadData() {
    // 读取实时指标数据
    let metricData$ = this.monitorSvc.getMonitorMetricsData(this.monitorId, this.metrics).subscribe(
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
}
