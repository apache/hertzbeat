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

import {ClipboardModule} from '@angular/cdk/clipboard';
import {NgModule, Type} from '@angular/core';
import {NzBreadCrumbModule} from 'ng-zorro-antd/breadcrumb';
import {NzLayoutModule} from 'ng-zorro-antd/layout';
import {NzRadioModule} from 'ng-zorro-antd/radio';
import {NzSpaceModule} from 'ng-zorro-antd/space';
import {NzSwitchModule} from 'ng-zorro-antd/switch';

import {MarketRoutingModule} from './market-routing.module';
import {TemplateDetailComponent} from './template-detail/template-detail.component';
import {TemplateListComponent} from './template-list/template-list.component';
import {NzInputDirective, NzInputGroupComponent} from "ng-zorro-antd/input";
import {NzOptionComponent, NzSelectModule} from "ng-zorro-antd/select";
import {NzButtonComponent} from "ng-zorro-antd/button";
import {RouterModule} from "@angular/router";
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {NzPaginationComponent} from "ng-zorro-antd/pagination";
import {NzCheckboxComponent, NzCheckboxGroupComponent} from "ng-zorro-antd/checkbox";
import {NzIconDirective} from "ng-zorro-antd/icon";
import {NzTooltipDirective} from "ng-zorro-antd/tooltip";
import {NzCardComponent, NzCardMetaComponent} from "ng-zorro-antd/card";
import {NzAvatarComponent} from "ng-zorro-antd/avatar";

const COMPONENTS: Array<Type<void>> = [TemplateListComponent, TemplateDetailComponent, TemplateListComponent];

@NgModule({
  imports: [
    MarketRoutingModule,
    NzBreadCrumbModule,
    NzSwitchModule,
    NzRadioModule,
    NzLayoutModule,
    NzSpaceModule,
    ClipboardModule,
    NzInputGroupComponent,
    NzOptionComponent,
    NzButtonComponent,
    NzInputDirective,
    CommonModule,
    FormsModule,
    NzSelectModule,
    NzPaginationComponent,
    NzCheckboxComponent,
    NzCheckboxGroupComponent,
    NzIconDirective,
    NzTooltipDirective,
    NzCardComponent,
    NzCardMetaComponent,
    NzAvatarComponent
  ],
  declarations: COMPONENTS,
  exports:[RouterModule]
})
export class MarketModule {}
