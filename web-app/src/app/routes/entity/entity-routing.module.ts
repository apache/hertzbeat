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

import { EntityDefinitionWorkspaceComponent } from './entity-definition-workspace/entity-definition-workspace.component';
import { EntityDiscoveryComponent } from './entity-discovery/entity-discovery.component';
import { EntityDetailComponent } from './entity-detail/entity-detail.component';
import { EntityEditorComponent } from './entity-editor/entity-editor.component';
import { EntityListComponent } from './entity-list/entity-list.component';

const routes: Routes = [
  { path: 'import', component: EntityDefinitionWorkspaceComponent, data: { titleI18n: 'entity.definition.import.title' } },
  { path: 'discovery', component: EntityDiscoveryComponent, data: { titleI18n: 'entity.entry-source.telemetry' } },
  { path: 'new', component: EntityEditorComponent, data: { titleI18n: 'entity.new' } },
  { path: ':entityId/definition', component: EntityDefinitionWorkspaceComponent, data: { titleI18n: 'entity.definition.workspace.edit-title' } },
  { path: ':entityId', component: EntityDetailComponent, data: { titleI18n: 'entity.detail' } },
  { path: ':entityId/edit', component: EntityEditorComponent, data: { titleI18n: 'entity.edit' } },
  { path: '', pathMatch: 'full', component: EntityListComponent, data: { titleI18n: 'entity.list' } },
  { path: '**', component: EntityListComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EntityRoutingModule {}
