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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { Router } from '@angular/router';
import { ALAIN_I18N_TOKEN } from '@delon/theme';

import { SettingsComponent } from './settings.component';

@Pipe({ name: 'i18n' })
class MockI18nPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SettingsComponent],
      imports: [MockI18nPipe],
      providers: [
        {
          provide: Router,
          useValue: {
            url: '/setting/settings/token',
            events: { pipe: () => ({ subscribe() { return { unsubscribe() {} }; } }) },
            navigateByUrl() {}
          }
        },
        {
          provide: ALAIN_I18N_TOKEN,
          useValue: { fanyi: (key: string) => key }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose the source-first settings shell copy', () => {
    expect(component.settingsShellTitle).toBe('settings.console.title');
    expect(component.settingsShellCopy).toBe('settings.console.copy');
  });

  it('should render inside the shared page shell instead of a bespoke header block', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('app-page-shell')).not.toBeNull();
    expect(root.querySelector('.settings-console-header')).toBeNull();
    expect(root.querySelector('.settings-console')).not.toBeNull();
  });
});
