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
import {NzAutosizeDirective, NzInputDirective} from "ng-zorro-antd/input";
import {NzFormControlComponent, NzFormDirective, NzFormItemComponent, NzFormLabelComponent} from "ng-zorro-antd/form";
import {NzColDirective} from "ng-zorro-antd/grid";
import {NzDatePickerComponent} from "ng-zorro-antd/date-picker";
import {NzTimePickerComponent} from "ng-zorro-antd/time-picker";
import {NzInputNumberComponent} from "ng-zorro-antd/input-number";
import {NzIconDirective} from "ng-zorro-antd/icon";

const COMPONENTS: Array<Type<void>> = [UserUploadComponent];

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
  ],
  declarations: COMPONENTS,
  providers:[...COMPONENTS],
})
export class UserCenterModule {}
