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

import { ClipboardModule } from '@angular/cdk/clipboard';
import { NgModule, Type } from '@angular/core';
import { SharedModule } from '@shared';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { NgxEchartsModule } from 'ngx-echarts';

import { SafePipe } from '../SafePipe';
import { MonitorDataChartComponent } from './monitor-data-chart/monitor-data-chart.component';
import { MonitorDataTableComponent } from './monitor-data-table/monitor-data-table.component';
import { MonitorDetailComponent } from './monitor-detail/monitor-detail.component';
import { MonitorEditComponent } from './monitor-edit/monitor-edit.component';
import { MonitorFormComponent } from './monitor-form/monitor-form.component';
import { MonitorListComponent } from './monitor-list/monitor-list.component';
import { MonitorNewComponent } from './monitor-new/monitor-new.component';
import { MonitorRoutingModule } from './monitor-routing.module';

const COMPONENTS: Array<Type<void>> = [
  MonitorNewComponent,
  MonitorEditComponent,
  MonitorFormComponent,
  MonitorListComponent,
  MonitorDetailComponent,
  MonitorDataTableComponent,
  MonitorDataChartComponent
];

@NgModule({
  imports: [
    SharedModule,
    MonitorRoutingModule,
    NzBreadCrumbModule,
    NzDividerModule,
    NzSwitchModule,
    NzTagModule,
    NzRadioModule,
    NgxEchartsModule,
    NzLayoutModule,
    NzSpaceModule,
    NzCollapseModule,
    ClipboardModule,
    NzUploadModule,
    SafePipe,
    NzListModule,
    NzDescriptionsModule,
    NzPaginationModule
  ],
  declarations: COMPONENTS
})
export class MonitorModule {}
