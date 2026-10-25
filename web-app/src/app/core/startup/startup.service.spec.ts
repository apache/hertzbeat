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

import { StartupService } from './startup.service';

describe('management startup permissions', () => {
  for (const role of [undefined, '["user"]', '["guest"]', '["operator"]', '["admin"]']) {
    it(`only loads management menus and capability for ${role}`, () => {
      const admin = role === '["admin"]';
      const menuEntries = [{ text: 'Management', link: '/dashboard' }];
      const icons = jasmine.createSpyObj('icons', ['addIcon']);
      const menu = jasmine.createSpyObj('menu', ['add', 'getItem', 'resume']);
      menu.getItem.and.returnValue(null);
      const i18n = jasmine.createSpyObj('i18n', ['loadLangData', 'use'], { defaultLang: 'en-US' });
      i18n.loadLangData.and.returnValue(of({}));
      const settings = jasmine.createSpyObj('settings', ['setApp'], { user: { role } });
      const acl = jasmine.createSpyObj('acl', ['setFull']);
      const http = jasmine.createSpyObj('http', ['get']);
      http.get.and.callFake((url: string) => {
        if (url === './assets/app-data.json') return of({ app: { name: 'HertzBeat' }, menu: menuEntries });
        if (url.startsWith('/apps/hierarchy')) return of({ data: [] });
        if (url === '/observability/capability') return of({ data: { enabled: true } });
        throw new Error(`Unexpected startup URL: ${url}`);
      });
      const storage = jasmine.createSpyObj('storage', ['putData']);
      const theme = jasmine.createSpyObj('theme', ['changeTheme']);
      const service = new StartupService(icons, menu, i18n, settings, acl, {} as never, {} as never, http, {} as never, storage, theme);
      let loaded = false;
      service.load().subscribe(() => (loaded = true));
      expect(loaded).toBeTrue();
      expect(menu.add).toHaveBeenCalledWith(admin ? menuEntries : []);
      expect(acl.setFull).toHaveBeenCalledWith(admin);
      expect(http.get.calls.allArgs().some((args: unknown[]) => args[0] === '/observability/capability')).toBe(admin);
    });
  }
});
