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

import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpHeaders,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
  HttpResponseBase
} from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { ALAIN_I18N_TOKEN, _HttpClient } from '@delon/theme';
import { environment } from '@env/environment';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, filter, mergeMap, switchMap, take } from 'rxjs/operators';

import {Message} from "../../pojo/Message";
import {AuthService} from '../../service/auth.service';
import {LocalStorageService} from '../../service/local-storage.service';

const CODE_MESSAGE: { [key: number]: string } = {
  400: 'Request Illegal Content, No Response.',
  401: 'Auth Error.',
  403: 'No Permission For This Request.',
  404: 'Not Found.',
  406: 'Request Illegal Content.',
  409: 'Request Conflict.',
  410: 'Request Resource Already Deleted.',
  422: 'Validate Error.',
  500: 'Server Error Happen.',
  502: 'Gateway Error.',
  503: 'Service Not Available, Try After.',
  504: 'Gateway Timeout.'
};

@Injectable()
export class DefaultInterceptor implements HttpInterceptor {
  private notified = false;
  // Whether token is refreshing
  private refreshToking = false;
  private refreshToken$: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private injector: Injector, private authSvc: AuthService, private storageSvc: LocalStorageService) {}

  private get notification(): NzNotificationService {
    return this.injector.get(NzNotificationService);
  }

  private get http(): _HttpClient {
    return this.injector.get(_HttpClient);
  }

  private goTo(url: string): void {
    setTimeout(() => {
      this.injector.get(Router).navigateByUrl(url);
      this.notified = false;
    });
  }

  private checkStatus(ev: HttpResponseBase): void {
    const errorText = CODE_MESSAGE[ev.status] || ev.statusText;
    console.warn(` ${ev.status}: ${ev.url}`, errorText);
    if (ev.status == 403) {
      this.notification.error(` ${ev.status}: ${errorText}`, '');
    } else {
      this.notification.error(` ${ev.status}: ${ev.url}`, errorText);
    }
  }

  /**
   * refresh Token request
   */
  private refreshTokenRequest(): Observable<Message<any>> {
    const refreshToken = this.storageSvc.getRefreshToken();
    if (refreshToken == null) {
      return throwError('refreshToken is null.');
    }
    return this.authSvc.refreshToken(refreshToken);
  }

  private tryRefreshToken(ev: HttpResponseBase, req: HttpRequest<any>, next: HttpHandler): Observable<any> {
    // 1, redirect to login page if this request is used for refreshing token
    if ([`/api/auth/refresh`].some(url => req.url.includes(url))) {
      this.toLogin();
      return throwError(ev);
    }
    // 2, if `refreshToking` is true, means that the refreshing token request is in progress
    // All requests will be suspended and wait for the refreshing token request to complete
    if (this.refreshToking) {
      return this.refreshToken$.pipe(
        filter(v => !!v),
        take(1),
        switchMap(() => next.handle(this.reAttachToken(req)))
      );
    }
    // 3、try refreshing Token
    this.refreshToking = true;
    this.refreshToken$.next(null);
    return this.refreshTokenRequest().pipe(
      switchMap(res => {
        // Check whether the TOKEN is correct
        this.refreshToking = false;
        if (res.code === 0 && res.data != undefined) {
          let token = res.data.token;
          let refreshToken = res.data.refreshToken;
          if (token != undefined) {
            this.storageSvc.storageAuthorizationToken(token);
            this.storageSvc.storageRefreshToken(refreshToken);
            // notifies subsequent requests to continue
            this.refreshToken$.next(token);
            return next.handle(this.reAttachToken(req));
          } else {
            console.warn(`flush new token failed. ${res.msg}`);
            return throwError('flush new token failed.');
          }
        } else {
          console.warn(`flush new token failed. ${res.msg}`);
          return throwError('flush new token failed.');
        }
      }),
      catchError(err => {
        // refreshing token is failed, redirect to login page
        console.warn(`flush new token failed. ${err.msg}`);
        this.refreshToking = false;
        this.toLogin();
        return throwError(err);
      })
    );
  }

  private reAttachToken(req: HttpRequest<any>): HttpRequest<any> {
    let token = this.storageSvc.getAuthorizationToken();
    return req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  private toLogin(): void {
    if (!this.notified) {
      this.notified = true;
      this.goTo('/login');
    }
  }

  private fillHeaders(headers?: HttpHeaders): { [name: string]: string } {
    const res: { [name: string]: string } = {};
    const lang = this.injector.get(ALAIN_I18N_TOKEN).currentLang;
    if (!headers?.has('Accept-Language') && lang) {
      res['Accept-Language'] = lang;
    }
    let token = this.storageSvc.getAuthorizationToken();
    if (token !== null) {
      res['Authorization'] = `Bearer ${token}`;
    }
    return res;
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let url = req.url;
    if (!url.startsWith('https://') && !url.startsWith('http://') && !url.startsWith('.')) {
      const { baseUrl } = environment.api;
      url = baseUrl + (baseUrl?.endsWith('/') && url.startsWith('/') ? url.substring(1) : url);
    }
    const newReq = req.clone({ url, setHeaders: this.fillHeaders(req.headers) });
    return next.handle(newReq).pipe(
      mergeMap(httpEvent => {
        if (httpEvent instanceof HttpResponseBase) {
          return of(httpEvent);
        } else {
          return of(httpEvent);
        }
      }),
      catchError((err: any) => {
        console.error("err:",err);
        // handle failed response and token expired
        switch (err.status) {
          case 401:
            console.log('检测到401了')
            return this.tryRefreshToken(err, newReq, next);
          case 404:
          case 500:
            this.goTo(`/exception/${err.status}?url=${req.urlWithParams}`);
            break;
          case 400:
            let resp = new HttpResponse({
              body: err.error,
              headers: err.headers,
              status: err.status,
              statusText: err.statusText
            });
            return of(resp);
          default:
            break;
        }
        this.checkStatus(err);
        return throwError(err.error);
      })
    );
  }
}
