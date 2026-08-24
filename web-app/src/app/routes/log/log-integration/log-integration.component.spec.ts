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

import { Router } from '@angular/router';
import { I18NService } from '@core';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { of } from 'rxjs';

import { AuthService } from '../../../service/auth.service';
import { ObservabilityService } from '../../../service/observability.service';
import { LogIntegrationComponent } from './log-integration.component';

describe('LogIntegrationComponent', () => {
  function createComponent() {
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['generateToken']);
    const observability = jasmine.createSpyObj<ObservabilityService>('ObservabilityService', ['probe']);
    const notifications = jasmine.createSpyObj<NzNotificationService>('NzNotificationService', ['success', 'error', 'warning']);
    const router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    const i18n = jasmine.createSpyObj<I18NService>('I18NService', ['fanyi']);
    i18n.fanyi.and.callFake(key => key);
    const component = new LogIntegrationComponent(auth, observability, notifications, router, i18n);
    component.endpoint = 'http://localhost:4200';
    return { component, auth, observability };
  }

  it('keeps the onboarding form simple and generates all configuration formats', () => {
    const { component } = createComponent();
    component.token = 'token-value';

    expect(component.formValid).toBeTrue();
    expect(component.snippet('environment')).toContain('OTEL_SERVICE_NAME=my-service');
    expect(component.snippet('collector')).toContain('metrics:');
    expect(component.snippet('collector')).toContain('logs:');
    expect(component.snippet('collector')).toContain('traces:');
    expect(component.snippet('java')).toContain('OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer token-value');
    expect(component.snippet('curl')).toContain('/api/otlp/v1/metrics');
  });

  it('generates a managed access token and detects each signal independently', () => {
    const { component, auth, observability } = createComponent();
    auth.generateToken.and.returnValue(of({ code: 0, data: { token: 'generated-token' }, msg: '' }));
    observability.probe.and.returnValue(
      of([
        { signal: 'metrics', status: 'success', lastReceived: 1 },
        { signal: 'logs', status: 'error', error: 'storage unavailable' },
        { signal: 'traces', status: 'success', lastReceived: 1 }
      ])
    );

    component.generateToken();
    component.detect();

    expect(component.token).toBe('generated-token');
    expect(component.probeResults.length).toBe(3);
    expect(component.probeResults[1].error).toBe('storage unavailable');
  });
});
