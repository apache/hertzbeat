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
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NgxEchartsModule } from 'ngx-echarts';

import { WorkspaceShellComponent } from '../../shared/components/workspace-shell/workspace-shell.component';
import { EntityDefinitionWorkspaceComponent } from './entity-definition-workspace/entity-definition-workspace.component';
import { EntityDiscoveryComponent } from './entity-discovery/entity-discovery.component';
import { EntityDetailComponent } from './entity-detail/entity-detail.component';
import { EntityEditorComponent } from './entity-editor/entity-editor.component';
import { EntityListComponent } from './entity-list/entity-list.component';
import { EntityRoutingModule } from './entity-routing.module';

const COMPONENTS: Array<Type<void>> = [
  EntityListComponent,
  EntityDetailComponent,
  EntityEditorComponent,
  EntityDiscoveryComponent,
  EntityDefinitionWorkspaceComponent
];

@NgModule({
  imports: [
    SharedModule,
    EntityRoutingModule,
    NzAutocompleteModule,
    NzBreadCrumbModule,
    NzDescriptionsModule,
    NzDividerModule,
    NzEmptyModule,
    NzListModule,
    NzPaginationModule,
    NzRadioModule,
    NzSpaceModule,
    NzTagModule,
    NzToolTipModule,
    NgxEchartsModule,
    WorkspaceShellComponent
  ],
  declarations: COMPONENTS
})
export class EntityModule {}
