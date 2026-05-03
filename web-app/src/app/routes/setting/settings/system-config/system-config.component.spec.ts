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

import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ALAIN_I18N_TOKEN, SettingsService } from '@delon/theme';
import { NzNotificationService } from 'ng-zorro-antd/notification';

import { GeneralConfigService } from '../../../../service/general-config.service';
import { ThemeService } from '../../../../service/theme.service';
import { SystemConfigComponent } from './system-config.component';

describe('SystemConfigComponent', () => {
  let component: SystemConfigComponent;
  let fixture: ComponentFixture<SystemConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [SystemConfigComponent],
      providers: [
        {
          provide: ALAIN_I18N_TOKEN,
          useValue: {
            fanyi: (key: string) => key,
            loadLangData: () => of({}),
            use: () => undefined
          }
        },
        { provide: SettingsService, useValue: { setLayout: () => undefined } },
        {
          provide: GeneralConfigService,
          useValue: {
            getGeneralConfig: () => of({ code: 0, data: { locale: 'en_US', theme: 'default' } }),
            getTimezones: () => of({ code: 0, data: [] }),
            saveGeneralConfig: () => of({ code: 0, data: null })
          }
        },
        {
          provide: ThemeService,
          useValue: {
            getTheme: () => 'default',
            resolveWorkbenchTheme: (theme: string) => theme,
            setTheme: () => undefined
          }
        },
        { provide: NzNotificationService, useValue: { success: () => undefined, error: () => undefined } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SystemConfigComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
