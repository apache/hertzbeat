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

import {NgModule} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {NzMessageModule} from 'ng-zorro-antd/message';
import {NzNotificationModule} from 'ng-zorro-antd/notification';
import {AppComponent} from "./app.component";
import {RouterOutlet} from "@angular/router";
import {NgxEchartsModule} from "ngx-echarts";
import {GlobalConfigModule} from "./global-config.module";
import {CoreModule} from "./core/core.module";
import {NzIconModule} from "ng-zorro-antd/icon";

// const INTERCEPTOR_PROVIDES = [{ provide: HTTP_INTERCEPTORS, useClass: DefaultInterceptor, multi: true }];

@NgModule({
  declarations: [],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    NzMessageModule,
    NzNotificationModule,
    RouterOutlet,
    AppComponent,
    ReactiveFormsModule,
    CoreModule,
    NzIconModule,
    GlobalConfigModule.forRoot(),
    NgxEchartsModule.forRoot({
      echarts: () => import((`echarts`))
    }),
  ],
})
export class AppModule {
}
