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

import { CONSTANTS } from '../../../shared/constants';
import { HeaderUserComponent } from './user.component';

describe('versioned management migration notice', () => {
  function create(data: Map<string, string>, fromLogin = false) {
    const storage = jasmine.createSpyObj('storage', ['getData', 'putData', 'clearAuthorization']);
    storage.getData.and.callFake((key: string) => data.get(key) ?? null);
    storage.putData.and.callFake((key: string, value: string) => data.set(key, value));
    const router = jasmine.createSpyObj('router', ['getCurrentNavigation', 'navigateByUrl']);
    router.getCurrentNavigation.and.returnValue(
      fromLogin ? { previousNavigation: { finalUrl: { toString: () => '/passport/login' } } } : null
    );
    const settings = jasmine.createSpyObj('settings', ['setUser'], { user: { name: 'reviewed-operator' } });
    return new HeaderUserComponent(settings, router, storage);
  }

  it('shows the new version once even when old about notices were disabled', fakeAsync(() => {
    const data = new Map([
      ['NOT_SHOW_ABOUT_NEXT_LOGIN', 'true'],
      ['ABOUT_LAST_SEEN_VERSION', 'v1.9.0']
    ]);
    const header = create(data, true);
    expect(header.isAboutModalVisible).toBeTrue();
    expect(data.get('ABOUT_LAST_SEEN_VERSION')).toBe(CONSTANTS.VERSION);
    tick(20000);
    expect(header.isAboutModalVisible).toBeTrue();
    header.disAboutModal();
    expect(header.isAboutModalVisible).toBeFalse();
    expect(create(data).isAboutModalVisible).toBeFalse();
  }));

  it('does not reopen on ordinary refresh after the version was seen', () => {
    const data = new Map([['ABOUT_LAST_SEEN_VERSION', CONSTANTS.VERSION]]);
    expect(create(data).isAboutModalVisible).toBeFalse();
  });

  it('retains the existing next-login opt-out after the migration notice', () => {
    const data = new Map([
      ['ABOUT_LAST_SEEN_VERSION', CONSTANTS.VERSION],
      ['NOT_SHOW_ABOUT_NEXT_LOGIN', 'true']
    ]);
    const header = create(data, true);
    expect(header.isAboutModalVisible).toBeFalse();
    header.showAboutModal();
    expect(header.isAboutModalVisible).toBeTrue();
    header.onNotShowAgainChange(false);
    expect(data.get('NOT_SHOW_ABOUT_NEXT_LOGIN')).toBe('false');
  });

  it('retains the existing timed about dialog on later logins when enabled', fakeAsync(() => {
    const header = create(new Map([['ABOUT_LAST_SEEN_VERSION', CONSTANTS.VERSION]]), true);
    expect(header.isAboutModalVisible).toBeTrue();
    tick(20000);
    expect(header.isAboutModalVisible).toBeFalse();
  }));
});
