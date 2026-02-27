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

import {enableProdMode, EnvironmentInjector, Injector, PLATFORM_ID, runInInjectionContext} from '@angular/core';
import {bootstrapApplication} from '@angular/platform-browser';
import {environment} from '@env/environment';
import {appConfig} from './app/app.config';
import {AppComponent} from './app/app.component';
import {DOCUMENT} from "@angular/common";
import {stepPreloader} from "@delon/theme";

const injector = Injector.create({
  providers: [
    { provide: PLATFORM_ID, useValue: 'browser' },
    {
      provide: DOCUMENT,
      useFactory: () => {
        return document;
      }
    }
  ]
}) as EnvironmentInjector;

let preloaderDone!: () => void;
runInInjectionContext(injector, () => (preloaderDone = stepPreloader()));
preloaderDone();

if (environment.production) {
  // console.log('生产模式启动',environment.api)
  enableProdMode();
}else {
  // console.log('开发模式启动：',environment.api)
}


bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    const win = window as any;
    if (win && win.appBootstrap) {
      win.appBootstrap();
    }
  })
  .catch((err) => console.error(err));
