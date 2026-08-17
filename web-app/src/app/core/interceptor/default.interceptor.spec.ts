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

import { HttpContext, HttpErrorResponse, HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injector } from '@angular/core';
import { Router } from '@angular/router';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../service/auth.service';
import { LocalStorageService } from '../../service/local-storage.service';
import { DefaultInterceptor } from './default.interceptor';
import { SILENT_HTTP_ERROR } from './http-context';

describe('DefaultInterceptor', () => {
  it('does not redirect when a silent refresh request is refused', done => {
    const router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    const injector = {
      get: (token: unknown) => {
        if (token === ALAIN_I18N_TOKEN) {
          return { currentLang: 'en-US' };
        }
        if (token === Router) {
          return router;
        }
        throw new Error(`Unexpected dependency: ${String(token)}`);
      }
    } as Injector;
    const authService = jasmine.createSpyObj<AuthService>('AuthService', ['refreshToken']);
    const localStorageService = jasmine.createSpyObj<LocalStorageService>('LocalStorageService', [
      'getAuthorizationToken',
      'getRefreshToken'
    ]);
    localStorageService.getAuthorizationToken.and.returnValue(null as any);
    const interceptor = new DefaultInterceptor(injector, authService, localStorageService);
    const request = new HttpRequest(
      'POST',
      '/account/auth/refresh',
      {},
      {
        context: new HttpContext().set(SILENT_HTTP_ERROR, true)
      }
    );
    const next = {
      handle: () => throwError(() => new HttpErrorResponse({ status: 401, url: request.url }))
    } as HttpHandler;

    interceptor.intercept(request, next).subscribe({
      error: error => {
        expect(error.status).toBe(401);
        setTimeout(() => {
          expect(router.navigateByUrl).not.toHaveBeenCalled();
          done();
        });
      }
    });
  });

  it('still refreshes and replays an ordinary silent request after a 401', () => {
    const injector = {
      get: (token: unknown) => {
        if (token === ALAIN_I18N_TOKEN) {
          return { currentLang: 'en-US' };
        }
        throw new Error(`Unexpected dependency: ${String(token)}`);
      }
    } as Injector;
    const authService = jasmine.createSpyObj<AuthService>('AuthService', ['refreshToken']);
    authService.refreshToken.and.returnValue(
      of({ code: 0, msg: '', data: { token: 'fresh-token', refreshToken: 'next-refresh-token' } } as any)
    );
    const localStorageService = jasmine.createSpyObj<LocalStorageService>('LocalStorageService', [
      'getAuthorizationToken',
      'getRefreshToken',
      'storageAuthorizationToken',
      'storageRefreshToken'
    ]);
    localStorageService.getAuthorizationToken.and.returnValue('expired-token');
    localStorageService.getRefreshToken.and.returnValue('a-refresh-token');
    const interceptor = new DefaultInterceptor(injector, authService, localStorageService);
    const request = new HttpRequest(
      'POST',
      '/api/observability/metrics',
      {},
      {
        context: new HttpContext().set(SILENT_HTTP_ERROR, true)
      }
    );
    const next = jasmine.createSpyObj<HttpHandler>('HttpHandler', ['handle']);
    next.handle.and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 401, url: request.url })),
      of(new HttpResponse({ status: 200 }))
    );

    let response: HttpResponse<unknown> | undefined;
    interceptor.intercept(request, next).subscribe(event => {
      if (event instanceof HttpResponse) {
        response = event;
      }
    });

    expect(response?.status).toBe(200);
    expect(authService.refreshToken).toHaveBeenCalledWith('a-refresh-token');
    expect(localStorageService.storageAuthorizationToken).toHaveBeenCalledWith('fresh-token');
    expect(localStorageService.storageRefreshToken).toHaveBeenCalledWith('next-refresh-token');
    expect(next.handle).toHaveBeenCalledTimes(2);
  });
});
