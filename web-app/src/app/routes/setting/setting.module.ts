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
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzCascaderModule } from 'ng-zorro-antd/cascader';
import { NzCodeEditorModule } from 'ng-zorro-antd/code-editor';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzPaginationComponent } from 'ng-zorro-antd/pagination';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzUploadComponent } from 'ng-zorro-antd/upload';
import { ColorPickerModule } from 'ngx-color-picker';

import { CollectorComponent } from './collector/collector.component';
import { DefineComponent } from './define/define.component';
import { SettingLabelComponent } from './label/label.component';
import { SettingPluginsComponent } from './plugins/plugin.component';
import { SettingRoutingModule } from './setting-routing.module';
import { MessageServerComponent } from './settings/message-server/message-server.component';
import { ObjectStoreComponent } from './settings/object-store/object-store.component';
import { SettingsComponent } from './settings/settings.component';
import { SystemConfigComponent } from './settings/system-config/system-config.component';
import { StatusComponent } from './status/status.component';

const COMPONENTS: Array<Type<void>> = [
  SettingLabelComponent,
  DefineComponent,
  SettingsComponent,
  MessageServerComponent,
  SystemConfigComponent,
  ObjectStoreComponent,
  CollectorComponent,
  StatusComponent,
  SettingPluginsComponent
];

@NgModule({
  imports: [
    SharedModule,
    SettingRoutingModule,
    NzDividerModule,
    NzBreadCrumbModule,
    NzCascaderModule,
    NzCollapseModule,
    NzListModule,
    NzSwitchModule,
    ColorPickerModule,
    NzTagModule,
    NzLayoutModule,
    NzCodeEditorModule,
    ClipboardModule,
    NzBadgeModule,
    NzRadioModule,
    NzUploadComponent,
    NzPaginationComponent,
    NzDropDownModule
  ],
  declarations: COMPONENTS
})
export class SettingModule {}
