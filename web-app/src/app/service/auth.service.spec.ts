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

import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { configureHttpServiceTest } from '@testing';

import { SILENT_HTTP_ERROR } from '../core/interceptor/http-context';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    configureHttpServiceTest();
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('can make a refresh request without global HTTP error handling', () => {
    const http = TestBed.inject(HttpTestingController);

    service.refreshToken('a-refresh-token', true).subscribe();

    const request = http.expectOne('/account/auth/refresh');
    expect(request.request.context.get(SILENT_HTTP_ERROR)).toBeTrue();
    request.flush({ code: 0, msg: '', data: {} });
  });
});
