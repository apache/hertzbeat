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

import { MonitorDetailComponent } from './monitor-detail/monitor-detail.component';
import { MonitorEditComponent } from './monitor-edit/monitor-edit.component';
import { MonitorListComponent } from './monitor-list/monitor-list.component';
import { MonitorNewComponent } from './monitor-new/monitor-new.component';

const routes: Routes = [
  { path: '', component: MonitorListComponent },
  { path: 'new', component: MonitorNewComponent },
  { path: ':monitorId/edit', component: MonitorEditComponent },
  { path: ':monitorId', component: MonitorDetailComponent, data: { titleI18n: 'monitor.detail' } },
  { path: '**', component: MonitorListComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MonitorRoutingModule {}
