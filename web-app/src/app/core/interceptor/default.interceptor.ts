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

import { Message } from '../../pojo/Message';
import { AuthService } from '../../service/auth.service';
import { LocalStorageService } from '../../service/local-storage.service';

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

/**
 * 默认HTTP拦截器，其注册细节见 `app.module.ts`
 */
@Injectable()
export class DefaultInterceptor implements HttpInterceptor {
  private notified = false;
  // 是否正在刷新TOKEN过程
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
   * 刷新 Token 请求
   */
  private refreshTokenRequest(): Observable<Message<any>> {
    const refreshToken = this.storageSvc.getRefreshToken();
    if (refreshToken == null) {
      return throwError('refreshToken is null.');
    }
    return this.authSvc.refreshToken(refreshToken);
  }

  // #region 刷新Token方式一：使用 401 重新刷新 Token

  private tryRefreshToken(ev: HttpResponseBase, req: HttpRequest<any>, next: HttpHandler): Observable<any> {
    // 1、若请求为刷新Token请求，表示来自刷新Token可以直接跳转登录页
    if ([`/account/auth/refresh`].some(url => req.url.includes(url))) {
      this.toLogin();
      return throwError(ev);
    }
    // 2、如果 `refreshToking` 为 `true` 表示已经在请求刷新 Token 中，后续所有请求转入等待状态，直至结果返回后再重新发起请求
    if (this.refreshToking) {
      return this.refreshToken$.pipe(
        filter(v => !!v),
        take(1),
        switchMap(() => next.handle(this.reAttachToken(req)))
      );
    }
    // 3、尝试调用刷新 Token
    this.refreshToking = true;
    this.refreshToken$.next(null);
    return this.refreshTokenRequest().pipe(
      switchMap(res => {
        // 判断刷新TOKEN是否正确
        this.refreshToking = false;
        if (res.code === 0 && res.data != undefined) {
          let token = res.data.token;
          let refreshToken = res.data.refreshToken;
          if (token != undefined) {
            this.storageSvc.storageAuthorizationToken(token);
            this.storageSvc.storageRefreshToken(refreshToken);
            // 通知后续请求继续执行
            this.refreshToken$.next(token);
            // 重新发起请求
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
        // token 刷新失败
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
      this.goTo('/passport/login');
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
      catchError((err: HttpErrorResponse) => {
        // 处理失败响应，处理token过期自动刷新
        switch (err.status) {
          case 401:
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
