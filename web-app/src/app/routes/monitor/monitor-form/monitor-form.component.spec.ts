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
import { FormsModule } from '@angular/forms';
import { configureShallowTest } from '@testing';

import { Monitor } from '../../../pojo/Monitor';
import { Param } from '../../../pojo/Param';
import { ParamDefine } from '../../../pojo/ParamDefine';
import { MonitorFormComponent } from './monitor-form.component';

describe('MonitorFormComponent', () => {
  let component: MonitorFormComponent;
  let fixture: ComponentFixture<MonitorFormComponent>;

  beforeEach(async () => {
    await configureShallowTest(MonitorFormComponent, [FormsModule]).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MonitorFormComponent);
    component = fixture.componentInstance;
    component.monitor = new Monitor();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should reset dependent paramValue to null and set display to false when dependency is not met', () => {
    const payloadDefine = new ParamDefine();
    payloadDefine.field = 'payload';
    payloadDefine.name = 'Payload';
    payloadDefine.type = 'textarea';
    (payloadDefine as any).depend = {
      httpMethod: ['POST', 'PUT']
    };

    const payloadParam = new Param();
    payloadParam.field = 'payload';
    payloadParam.paramValue = '{"test": "data"}';
    payloadParam.display = true;

    component.paramDefines = [];
    component.params = [];
    component.sdDefines = [];
    component.sdParams = [];
    component.advancedParamDefines = [payloadDefine];
    component.advancedParams = [payloadParam];

    component.onDependChanged('GET', 'httpMethod');

    expect(payloadParam.display).toBeFalse();
    expect(payloadParam.paramValue).toBeNull();
    expect(component.hasAdvancedParams).toBeFalse();
  });

  it('should set display to true when dependency is met', () => {
    const payloadDefine = new ParamDefine();
    payloadDefine.field = 'payload';
    payloadDefine.name = 'Payload';
    payloadDefine.type = 'textarea';
    (payloadDefine as any).depend = {
      httpMethod: ['POST', 'PUT']
    };

    const payloadParam = new Param();
    payloadParam.field = 'payload';
    payloadParam.paramValue = null;
    payloadParam.display = false;

    component.paramDefines = [];
    component.params = [];
    component.sdDefines = [];
    component.sdParams = [];
    component.advancedParamDefines = [payloadDefine];
    component.advancedParams = [payloadParam];

    component.onDependChanged('POST', 'httpMethod');

    expect(payloadParam.display).toBeTrue();
    expect(component.hasAdvancedParams).toBeTrue();
  });

  it('should reevaluate dependent advanced fields when a boolean parent changes', () => {
    const fingerprintDefine = new ParamDefine();
    fingerprintDefine.field = 'hostKeyFingerprint';
    fingerprintDefine.name = 'SFTP Host Key Fingerprints';
    fingerprintDefine.type = 'textarea';
    (fingerprintDefine as any).depend = {
      ssl: [true]
    };

    const fingerprintParam = new Param();
    fingerprintParam.field = 'hostKeyFingerprint';
    fingerprintParam.paramValue = 'SHA256:test';
    fingerprintParam.display = false;

    component.monitor.app = 'ftp';
    component.paramDefines = [];
    component.params = [];
    component.sdDefines = [];
    component.sdParams = [];
    component.advancedParamDefines = [fingerprintDefine];
    component.advancedParams = [fingerprintParam];

    component.onParamBooleanChanged(true, 'ssl');
    expect(fingerprintParam.display).toBeTrue();
    expect(component.hasAdvancedParams).toBeTrue();

    component.onParamBooleanChanged(false, 'ssl');
    expect(fingerprintParam.display).toBeFalse();
    expect(fingerprintParam.paramValue).toBeNull();
    expect(component.hasAdvancedParams).toBeFalse();
  });

  it('should not treat a persisted false string as an enabled boolean', () => {
    const portParam = new Param();
    portParam.field = 'port';
    portParam.paramValue = 21;

    component.monitor.app = 'ftp';
    component.params = [portParam];
    component.paramDefines = [];
    component.sdDefines = [];
    component.sdParams = [];
    component.advancedParamDefines = [];
    component.advancedParams = [];

    component.onParamBooleanChanged('false', 'ssl');

    expect(portParam.paramValue).toBe(21);
  });
});
