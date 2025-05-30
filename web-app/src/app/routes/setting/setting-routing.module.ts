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

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CollectorComponent } from './collector/collector.component';
import { DefineComponent } from './define/define.component';
import { SettingLabelComponent } from './label/label.component';
import { SettingPluginsComponent } from './plugins/plugin.component';
import { MessageServerComponent } from './settings/message-server/message-server.component';
import { ObjectStoreComponent } from './settings/object-store/object-store.component';
import { SettingsComponent } from './settings/settings.component';
import { SystemConfigComponent } from './settings/system-config/system-config.component';
import { StatusComponent } from './status/status.component';

const routes: Routes = [
  { path: 'labels', component: SettingLabelComponent },
  { path: 'plugins', component: SettingPluginsComponent },
  { path: 'collector', component: CollectorComponent },
  { path: 'status', component: StatusComponent },
  { path: 'define', component: DefineComponent, data: { titleI18n: 'menu.advanced.define' } },
  {
    path: 'settings',
    component: SettingsComponent,
    children: [
      { path: '', redirectTo: 'config', pathMatch: 'full' },
      {
        path: 'server',
        component: MessageServerComponent,
        data: { titleI18n: 'settings.server' }
      },
      {
        path: 'config',
        component: SystemConfigComponent,
        data: { titleI18n: 'settings.system-config' }
      },
      {
        path: 'object-store',
        component: ObjectStoreComponent,
        data: { titleI18n: 'settings.object-store' }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SettingRoutingModule {}
