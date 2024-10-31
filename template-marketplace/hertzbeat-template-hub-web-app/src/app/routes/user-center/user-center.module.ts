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
import {NgModule, Type} from '@angular/core';
import {NzDividerModule} from 'ng-zorro-antd/divider';
import {NzUploadModule} from 'ng-zorro-antd/upload';

import {UserCenterRoutingModule} from './user-center-routing.module';
import {UserUploadComponent} from './user-upload/user-upload.component';
import {FormsModule} from "@angular/forms";
import {CommonModule} from "@angular/common";
import {NzOptionComponent, NzSelectComponent} from "ng-zorro-antd/select";
import {NzAutosizeDirective, NzInputDirective, NzInputGroupComponent} from "ng-zorro-antd/input";
import {NzFormControlComponent, NzFormDirective, NzFormItemComponent, NzFormLabelComponent} from "ng-zorro-antd/form";
import {NzColDirective, NzRowDirective} from "ng-zorro-antd/grid";
import {NzDatePickerComponent} from "ng-zorro-antd/date-picker";
import {NzTimePickerComponent} from "ng-zorro-antd/time-picker";
import {NzInputNumberComponent} from "ng-zorro-antd/input-number";
import {NzIconDirective} from "ng-zorro-antd/icon";
import {UserAssetsComponent} from "./user-assets/user-assets.component";
import {NzPaginationComponent} from "ng-zorro-antd/pagination";
import {AssetsDetailComponent} from "./assets-detail/assets-detail.component";
import {NzDrawerComponent, NzDrawerContentDirective} from "ng-zorro-antd/drawer";
import {NzButtonComponent} from "ng-zorro-antd/button";
import {UserStarComponent} from "./user-star/user-star.component";
import {NzTooltipDirective} from "ng-zorro-antd/tooltip";
import {NzAvatarComponent} from "ng-zorro-antd/avatar";
import {NzCardComponent, NzCardMetaComponent} from "ng-zorro-antd/card";

const COMPONENTS: Array<Type<void>> = [UserUploadComponent, UserAssetsComponent,AssetsDetailComponent,UserStarComponent];

@NgModule({

    imports: [
        UserCenterRoutingModule,
        NzDividerModule,
        NzUploadModule,
        FormsModule,
        CommonModule,
        NzOptionComponent,
        NzSelectComponent,
        NzAutosizeDirective,
        NzInputDirective,
        NzFormItemComponent,
        NzFormLabelComponent,
        NzFormControlComponent,
        NzColDirective,
        NzDatePickerComponent,
        NzTimePickerComponent,
        NzInputNumberComponent,
        NzFormDirective,
        NzIconDirective,
        NzPaginationComponent,
        NzDrawerComponent,
        NzButtonComponent,
        NzInputGroupComponent,
        NzRowDirective,
        NzDrawerContentDirective,
        NzTooltipDirective,
        NzAvatarComponent,
        NzCardComponent,
        NzCardMetaComponent,
    ],
  declarations: COMPONENTS,
  providers:[...COMPONENTS],
})
export class UserCenterModule {}
