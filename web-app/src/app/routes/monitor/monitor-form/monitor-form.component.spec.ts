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

import { MonitorFormComponent } from './monitor-form.component';

describe('MonitorFormComponent', () => {
  let component: MonitorFormComponent;

  beforeEach(() => {
    component = new MonitorFormComponent(
      {
        info: () => undefined,
        error: () => undefined
      } as any,
      {
        fanyi: (key: string) => key
      } as any
    );
    component.monitor = { name: 'api monitor', scheduleType: 'interval' } as any;
    component.collector = '';
    component.sdParams = [];
    component.paramDefines = [];
    component.sdDefines = [];
    component.advancedParamDefines = [{ depend: { httpMethod: ['POST'] } } as any];
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should clear payload when httpMethod changes to a method without body', () => {
    component.advancedParams = [{ field: 'payload', paramValue: 'old body' } as any];

    component.onDependChanged('GET', 'httpMethod');

    expect(component.advancedParams[0].paramValue).toBe('');
  });

  it('should keep payload when httpMethod changes to POST-like methods', () => {
    component.advancedParams = [{ field: 'payload', paramValue: 'old body' } as any];

    component.onDependChanged('POST', 'httpMethod');

    expect(component.advancedParams[0].paramValue).toBe('old body');
  });

  it('should clear payload before submitting a GET monitor', () => {
    component.params = [{ field: 'httpMethod', paramValue: 'GET' } as any];
    component.advancedParams = [{ field: 'payload', paramValue: 'old body' } as any];
    spyOn(component.formSubmit, 'emit');

    component.onSubmit({ invalid: false } as any);

    expect(component.advancedParams[0].paramValue).toBe('');
  });
});
