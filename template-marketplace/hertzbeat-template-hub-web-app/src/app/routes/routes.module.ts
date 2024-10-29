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
import {NzCollapseModule} from 'ng-zorro-antd/collapse';
import {NzDividerModule} from 'ng-zorro-antd/divider';
import {NzListModule} from 'ng-zorro-antd/list';
import {NzTagModule} from 'ng-zorro-antd/tag';
import {NzTimelineModule} from 'ng-zorro-antd/timeline';

import {LayoutModule} from '../layout/layout.module';
import {HomePageComponent} from './home-page/home-page.component';
import {LoginComponent} from './login/login.component';
import {RouterModule} from "@angular/router";
import {NzMessageModule} from "ng-zorro-antd/message";
import {BrowserModule} from "@angular/platform-browser";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {FormsModule} from "@angular/forms";
import {SignUpComponent} from "./sign-up/sign-up.component";

const COMPONENTS: Array<Type<void>> = [
  HomePageComponent,LoginComponent,SignUpComponent
];

@NgModule({
  imports: [
    NzTagModule,
    NzTimelineModule,
    NzDividerModule,
    LayoutModule,
    NzCollapseModule,
    NzListModule,
    RouterModule,
    COMPONENTS,
    NzMessageModule,
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule
  ],
  exports:[RouterModule]
})
export class RoutesModule {}
