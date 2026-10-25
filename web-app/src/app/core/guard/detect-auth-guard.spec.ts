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

import { fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { I18NService } from '@core';
import { SettingsService } from '@delon/theme';

import { DetectAuthGuard } from './detect-auth-guard';

describe('management route guard', () => {
  for (const role of [undefined, '["user"]', '["guest"]', '["operator"]', '["administrator"]', 'invalid']) {
    it(`rejects a stored session with role ${role}`, fakeAsync(() => {
      const storage = jasmine.createSpyObj('storage', ['hasAuthorizationToken']);
      storage.hasAuthorizationToken.and.returnValue(true);
      const notify = jasmine.createSpyObj('notify', ['warning']);
      const router = jasmine.createSpyObj('router', ['navigateByUrl']);
      const settings = { user: { role } } as unknown as SettingsService;
      const i18n = { fanyi: (key: string) => key } as I18NService;
      const guard = new DetectAuthGuard(storage, settings, notify, i18n, router);
      expect(guard.canActivate({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)).toBeFalse();
      tick();
      expect(router.navigateByUrl).toHaveBeenCalledWith('/passport/login');
      expect(notify.warning).toHaveBeenCalledWith('app.management.admin-only', '');
    }));
  }

  it('requires a token even when local role storage claims admin', fakeAsync(() => {
    const storage = jasmine.createSpyObj('storage', ['hasAuthorizationToken']);
    storage.hasAuthorizationToken.and.returnValue(false);
    const router = jasmine.createSpyObj('router', ['navigateByUrl']);
    const notify = jasmine.createSpyObj('notify', ['warning']);
    const guard = new DetectAuthGuard(
      storage,
      { user: { role: '["admin"]' } } as unknown as SettingsService,
      notify,
      { fanyi: (key: string) => key } as I18NService,
      router
    );
    expect(guard.canActivate({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)).toBeFalse();
    tick();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/passport/login');
  }));

  it('accepts an authenticated administrator without restricting the username', () => {
    const storage = jasmine.createSpyObj('storage', ['hasAuthorizationToken']);
    storage.hasAuthorizationToken.and.returnValue(true);
    const router = jasmine.createSpyObj('router', ['navigateByUrl']);
    const guard = new DetectAuthGuard(
      storage,
      { user: { name: 'reviewed-operator', role: '["admin"]' } } as unknown as SettingsService,
      jasmine.createSpyObj('notify', ['warning']),
      { fanyi: (key: string) => key } as I18NService,
      router
    );
    expect(guard.canActivate({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)).toBeTrue();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
