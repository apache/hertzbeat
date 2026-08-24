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

import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CUSTOM_ELEMENTS_SCHEMA, Type } from '@angular/core';
import { TestBed, TestModuleMetadata } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, RouterModule } from '@angular/router';
import { ALAIN_I18N_TOKEN, AlainThemeModule } from '@delon/theme';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { of } from 'rxjs';

const imports = [
  HttpClientTestingModule,
  NoopAnimationsModule,
  RouterModule,
  NzGridModule,
  NzMenuModule,
  NzModalModule,
  NzTableModule,
  NzToolTipModule,
  AlainThemeModule.forRoot()
];

const providers = [
  provideRouter([]),
  {
    provide: ALAIN_I18N_TOKEN,
    useValue: {
      change: of(null),
      currentLang: 'en-US',
      defaultLang: 'en-US',
      fanyi: (key: string) => key
    }
  }
];

export function configureShallowTest(component: Type<unknown>, extraImports: NonNullable<TestModuleMetadata['imports']> = []): TestBed {
  return TestBed.configureTestingModule({
    imports: [...imports, ...extraImports],
    declarations: [component],
    providers,
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
  });
}

export function configureStandaloneTest(component: Type<unknown>, extraImports: NonNullable<TestModuleMetadata['imports']> = []): TestBed {
  return TestBed.configureTestingModule({
    imports: [HttpClientTestingModule, component, ...extraImports],
    providers
  });
}

export function configureHttpServiceTest(): TestBed {
  return TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
}
