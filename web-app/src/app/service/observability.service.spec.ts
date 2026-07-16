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

import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, of } from 'rxjs';

import { SILENT_HTTP_ERROR } from '../core/interceptor/http-context';
import { ObservabilityService, OtlpConnectionForm, SignalProbeResult } from './observability.service';

interface ObservabilityServiceInternals {
  failedProbe(signal: SignalProbeResult['signal'], error: unknown): SignalProbeResult;
  send(config: OtlpConnectionForm, signal: string, payload: unknown): Observable<unknown>;
}

interface HttpRequestOptions {
  context: HttpContext;
}

describe('ObservabilityService', () => {
  it('maps browser transport failures to a user-facing message key', () => {
    const service = new ObservabilityService({} as HttpClient);
    const result = (service as unknown as ObservabilityServiceInternals).failedProbe('metrics', new ProgressEvent('error'));

    expect(result.errorKey).toBe('observability.integration.error.network');
    expect(result.error).toBeUndefined();
  });

  it('maps wrapped HTTP transport failures to the same message key', () => {
    const service = new ObservabilityService({} as HttpClient);
    const result = (service as unknown as ObservabilityServiceInternals).failedProbe('logs', {
      status: 0,
      error: new ProgressEvent('error')
    });

    expect(result.errorKey).toBe('observability.integration.error.network');
  });

  it('preserves a server error message', () => {
    const service = new ObservabilityService({} as HttpClient);
    const result = (service as unknown as ObservabilityServiceInternals).failedProbe('traces', {
      error: { msg: 'Storage unavailable' }
    });

    expect(result.error).toBe('Storage unavailable');
    expect(result.errorKey).toBeUndefined();
  });

  it('marks probe ingestion requests as locally handled', () => {
    const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['post']);
    http.post.and.returnValue(of({}));
    const service = new ObservabilityService(http);

    (service as unknown as ObservabilityServiceInternals)
      .send({ endpoint: 'http://localhost:1157', token: 'token', serviceName: 'service', environment: 'test' }, 'metrics', {})
      .subscribe();

    const options = http.post.calls.mostRecent().args[2] as HttpRequestOptions;
    expect(options.context.get(SILENT_HTTP_ERROR)).toBeTrue();
  });
});
