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

import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';

import { PluginService } from '../../../service/plugin.service';
import { SettingPluginsComponent } from './plugin.component';

describe('Plugin parameter editor isolation regression', () => {
  let component: SettingPluginsComponent;
  let http: HttpTestingController;
  let notifications: jasmine.SpyObj<any>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [PluginService] });
    http = TestBed.inject(HttpTestingController);
    notifications = jasmine.createSpyObj('notifications', ['success', 'error']);
    component = new SettingPluginsComponent(
      notifications,
      jasmine.createSpyObj('modal', ['confirm']),
      TestBed.inject(PluginService),
      new FormBuilder(),
      { defaultLang: 'en-US', fanyi: (key: string) => key } as any
    );
  });

  afterEach(() => http.verify());

  function detail(id: number, field: string) {
    const request = http.expectOne(req => req.url === '/plugin/params/define' && req.params.get('pluginMetadataId') === String(id));
    expect(request.request.method).toBe('GET');
    request.flush({
      code: 0,
      data: {
        paramDefines: [{ field, type: 'text', name: { 'en-US': field }, required: true }],
        pluginParams: [{ field, paramValue: `saved-${field}` }]
      }
    });
  }

  function expectSave(id: number, field: string, value: string) {
    component.onEditPluginParamDefineModalOk();
    const request = http.expectOne('/plugin/params');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual([{ pluginMetadataId: id, type: 1, field, paramValue: value }]);
    return request;
  }

  it('saves only B after opening A, cancelling, and editing B', () => {
    component.onEditPluginParamDefine(1);
    detail(1, 'alpha');
    component.params.alpha.paramValue = 'unsaved-alpha';
    component.onEditPluginParamDefineModalCancel();
    component.onEditPluginParamDefine(2);
    detail(2, 'beta');
    component.params.beta.paramValue = 'edited-beta';

    expectSave(2, 'beta', 'edited-beta').flush({ code: 0 });
    expect(component.isEditPluginParamDefineModalVisible).toBeFalse();
  });

  it('does not revive a removed field when reopening the same plugin', () => {
    component.onEditPluginParamDefine(1);
    detail(1, 'alpha');
    component.onEditPluginParamDefineModalCancel();
    component.onEditPluginParamDefine(1);
    detail(1, 'beta');

    expectSave(1, 'beta', 'saved-beta').flush({ code: 0 });
  });

  it('does not carry old fields into a plugin with no definitions', () => {
    component.onEditPluginParamDefine(1);
    detail(1, 'alpha');
    component.onEditPluginParamDefineModalCancel();
    component.onEditPluginParamDefine(2);
    http
      .expectOne(req => req.params.get('pluginMetadataId') === '2')
      .flush({
        code: 0,
        data: { paramDefines: [], pluginParams: [] }
      });
    component.onEditPluginParamDefineModalOk();
    const save = http.expectOne('/plugin/params');
    expect(save.request.body).toEqual([]);
    save.flush({ code: 0 });
  });

  it('ignores A detail arriving after B has become the active editor', () => {
    component.onEditPluginParamDefine(1);
    component.onEditPluginParamDefine(2);
    detail(2, 'beta');
    detail(1, 'alpha');

    expect(component.paramDefines.map(item => item.field)).toEqual(['beta']);
    expectSave(2, 'beta', 'saved-beta').flush({ code: 0 });
  });

  it('does not reopen a cancelled pending detail request or save its old draft', () => {
    component.onEditPluginParamDefine(1);
    component.onEditPluginParamDefineModalCancel();
    detail(1, 'alpha');
    component.onEditPluginParamDefineModalOk();

    expect(component.isEditPluginParamDefineModalVisible).toBeFalse();
    http.expectNone('/plugin/params');
  });

  for (const transportFailure of [false, true]) {
    it(`does not save the previous draft after a ${transportFailure ? 'transport' : 'business'} load failure`, fakeAsync(() => {
      component.onEditPluginParamDefine(1);
      detail(1, 'alpha');
      component.onEditPluginParamDefineModalCancel();
      component.onEditPluginParamDefine(2);
      const request = http.expectOne(req => req.params.get('pluginMetadataId') === '2');
      if (transportFailure) request.flush({}, { status: 503, statusText: 'Unavailable' });
      else request.flush({ code: 1, msg: 'load rejected' });
      expect(() => tick()).not.toThrow();
      component.onEditPluginParamDefineModalOk();

      http.expectNone('/plugin/params');
      expect(component.isEditPluginParamDefineModalVisible).toBeFalse();
      expect(notifications.error).toHaveBeenCalled();
    }));
  }

  it('keeps a rejected save editable and does not report success', () => {
    component.onEditPluginParamDefine(2);
    detail(2, 'beta');
    expectSave(2, 'beta', 'saved-beta').flush({ code: 1, msg: 'save rejected' });

    expect(component.isEditPluginParamDefineModalVisible).toBeTrue();
    expect(notifications.success).not.toHaveBeenCalled();
    expectSave(2, 'beta', 'saved-beta').flush({ code: 0 });
  });

  it('does not close B when an earlier A save completes', () => {
    component.onEditPluginParamDefine(1);
    detail(1, 'alpha');
    const saveA = expectSave(1, 'alpha', 'saved-alpha');
    component.onEditPluginParamDefineModalCancel();
    component.onEditPluginParamDefine(2);
    detail(2, 'beta');
    saveA.flush({ code: 0 });

    expect(component.isEditPluginParamDefineModalVisible).toBeTrue();
    expectSave(2, 'beta', 'saved-beta').flush({ code: 0 });
  });
});
