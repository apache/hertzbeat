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

import { of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzConfigService } from 'ng-zorro-antd/core/config';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { Router } from '@angular/router';
import { StartupService } from '@core';

import { AppDefineService } from '../../../service/app-define.service';
import { GeneralConfigService } from '../../../service/general-config.service';
import { ThemeService } from '../../../service/theme.service';
import { DefineComponent } from './define.component';

describe('DefineComponent', () => {
  let component: DefineComponent;
  let fixture: ComponentFixture<DefineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DefineComponent],
      providers: [
        {
          provide: ALAIN_I18N_TOKEN,
          useValue: {
            defaultLang: 'en-US',
            fanyi: (key: string) => key
          }
        },
        {
          provide: AppDefineService,
          useValue: {
            getAppHierarchy: () => of({ code: 0, data: [] }),
            getAppDefineYmlContent: () => of({ code: 0, data: '' }),
            newAppDefineYmlContent: () => of({ code: 0, data: null }),
            deleteAppDefine: () => of({ code: 0, data: null })
          }
        },
        { provide: GeneralConfigService, useValue: {} },
        {
          provide: ThemeService,
          useValue: {
            getTheme: () => 'default',
            resolveWorkbenchTheme: (theme: string) => theme,
            isDarkTheme: () => false
          }
        },
        { provide: StartupService, useValue: { loadConfigResourceViaHttp: () => of(null) } },
        { provide: Router, useValue: { navigateByUrl: () => Promise.resolve(true) } },
        { provide: NzConfigService, useValue: { getConfigForComponent: () => ({}), set: () => undefined } },
        { provide: NzNotificationService, useValue: { warning: () => undefined, success: () => undefined, error: () => undefined } },
        { provide: NzModalService, useValue: { confirm: () => undefined } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DefineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
