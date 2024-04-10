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

import { NgModule, Type } from '@angular/core';
import { SharedModule } from '@shared';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzCascaderModule } from 'ng-zorro-antd/cascader';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTimePickerModule } from 'ng-zorro-antd/time-picker';
import { NzTransferModule } from 'ng-zorro-antd/transfer';
import { NzUploadModule } from 'ng-zorro-antd/upload';

import { AlertCenterComponent } from './alert-center/alert-center.component';
import { AlertConvergeComponent } from './alert-converge/alert-converge.component';
import { AlertNoticeComponent } from './alert-notice/alert-notice.component';
import { AlertRoutingModule } from './alert-routing.module';
import { AlertSettingComponent } from './alert-setting/alert-setting.component';
import { AlertSilenceComponent } from './alert-silence/alert-silence.component';

const COMPONENTS: Array<Type<void>> = [
  AlertCenterComponent,
  AlertSettingComponent,
  AlertNoticeComponent,
  AlertSilenceComponent,
  AlertConvergeComponent
];

@NgModule({
  imports: [
    SharedModule,
    AlertRoutingModule,
    NzDividerModule,
    NzBreadCrumbModule,
    NzTagModule,
    NzRadioModule,
    NzSwitchModule,
    NzCascaderModule,
    NzTransferModule,
    NzCollapseModule,
    NzListModule,
    NzTimePickerModule,
    NzDatePickerModule,
    NzBadgeModule,
    NzUploadModule
  ],
  declarations: COMPONENTS
})
export class AlertModule {}
