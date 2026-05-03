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
import { TestBed } from '@angular/core/testing';

import { OtlpIngestionService } from './otlp-ingestion.service';

describe('OtlpIngestionService', () => {
  let service: OtlpIngestionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(OtlpIngestionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should request the OTLP metrics console endpoint with the provided context', () => {
    service
      .getMetricsConsole({
        entityId: '42',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'prod',
        start: 1000,
        end: 2000,
        query: 'sum by (__name__) ({service_name="checkout"})'
      })
      .subscribe();

    const request = httpMock.expectOne(req => req.url === '/ingestion/otlp/metrics/console');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('entityId')).toBe('42');
    expect(request.request.params.get('serviceName')).toBe('checkout');
    expect(request.request.params.get('serviceNamespace')).toBe('commerce');
    expect(request.request.params.get('environment')).toBe('prod');
    expect(request.request.params.get('start')).toBe('1000');
    expect(request.request.params.get('end')).toBe('2000');
    expect(request.request.params.get('query')).toBe('sum by (__name__) ({service_name="checkout"})');
    request.flush({ code: 0, msg: '', data: null });
  });
});
