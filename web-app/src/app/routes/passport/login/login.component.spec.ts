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

import { ChangeDetectorRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { StartupService } from '@core';
import { ITokenService, SocialService } from '@delon/auth';
import { SettingsService, _HttpClient } from '@delon/theme';
import { of } from 'rxjs';

import { LocalStorageService } from '../../../service/local-storage.service';
import { UserLoginComponent } from './login.component';

describe('UserLoginComponent', () => {
  function createComponent() {
    const router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    const settingsService = jasmine.createSpyObj<SettingsService>('SettingsService', ['setUser']);
    const socialService = jasmine.createSpyObj<SocialService>('SocialService', ['login']);
    const tokenService = {
      referrer: { url: '/passport/login' }
    } as ITokenService;
    const startupSrv = jasmine.createSpyObj<StartupService>('StartupService', ['load']);
    const http = jasmine.createSpyObj<_HttpClient>('_HttpClient', ['post']);
    const cdr = jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['detectChanges']);
    const storageSvc = jasmine.createSpyObj<LocalStorageService>('LocalStorageService', [
      'storageAuthorizationToken',
      'storageRefreshToken'
    ]);

    startupSrv.load.and.returnValue(of(void 0));
    http.post.and.returnValue(
      of({
        code: 0,
        msg: '',
        data: {
          token: 'access-token',
          refreshToken: 'refresh-token',
          role: ['admin']
        }
      })
    );

    const component = new UserLoginComponent(
      new FormBuilder(),
      router,
      settingsService,
      socialService,
      null as unknown as any,
      tokenService,
      startupSrv,
      http,
      cdr,
      storageSvc
    );

    component.form.patchValue({
      userName: 'admin',
      password: 'hertzbeat'
    });
    component.needUpdatePassword = true;

    return { component, router, settingsService, startupSrv, storageSvc };
  }

  it('should continue login success flow when reuse tab service is unavailable', () => {
    const { component, router, settingsService, startupSrv, storageSvc } = createComponent();

    component.submit();

    expect(storageSvc.storageAuthorizationToken).toHaveBeenCalledWith('access-token');
    expect(storageSvc.storageRefreshToken).toHaveBeenCalledWith('refresh-token');
    expect(settingsService.setUser).toHaveBeenCalled();
    expect(startupSrv.load).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });
});
