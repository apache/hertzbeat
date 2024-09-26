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
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzUploadModule } from 'ng-zorro-antd/upload';

import { NzCascaderModule } from 'ng-zorro-antd/cascader';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzTimePickerModule } from 'ng-zorro-antd/time-picker';
import { NzTransferModule } from 'ng-zorro-antd/transfer';

import { UserCenterRoutingModule } from './user-center-routing.module';
import { UserUploadComponent } from './user-upload/user-upload.component';
import {FormsModule} from "@angular/forms";
import {NzBadgeModule} from "ng-zorro-antd/badge";
import {HttpClientModule} from "@angular/common/http";
import {CommonModule} from "@angular/common";

const COMPONENTS: Array<Type<void>> = [UserUploadComponent];

@NgModule({

  imports: [
    UserCenterRoutingModule,
    NzBreadCrumbModule,
    NzDividerModule,
    NzSwitchModule,
    NzRadioModule,
    NzLayoutModule,
    NzSpaceModule,
    NzCollapseModule,
    ClipboardModule,
    NzUploadModule,
    FormsModule,
    NzCascaderModule,
    NzTransferModule,
    NzTimePickerModule,
    NzDatePickerModule,
    NzBadgeModule,
    CommonModule
  ],
  declarations: COMPONENTS,
  providers:[...COMPONENTS],
})
export class UserCenterModule {}
