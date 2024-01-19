import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AlertDefine } from '../pojo/AlertDefine';
import { AlertDefineBind } from '../pojo/AlertDefineBind';
import { Message } from '../pojo/Message';
import { Page } from '../pojo/Page';

const alert_define_uri = '/alert/define';
const alert_defines_uri = '/alert/defines';
const export_defines_uri = '/alert/defines/export';

@Injectable({
  providedIn: 'root'
})
export class AlertDefineService {
  constructor(private http: HttpClient) {}

  public newAlertDefine(body: AlertDefine): Observable<Message<any>> {
    return this.http.post<Message<any>>(alert_define_uri, body);
  }

  public editAlertDefine(body: AlertDefine): Observable<Message<any>> {
    return this.http.put<Message<any>>(alert_define_uri, body);
  }

  public getAlertDefine(alertDefineId: number): Observable<Message<AlertDefine>> {
    return this.http.get<Message<AlertDefine>>(`${alert_define_uri}/${alertDefineId}`);
  }

  public applyAlertDefineMonitorsBind(alertDefineId: number, binds: AlertDefineBind[]): Observable<Message<any>> {
    return this.http.post<Message<any>>(`${alert_define_uri}/${alertDefineId}/monitors`, binds);
  }

  public getAlertDefineMonitorsBind(alertDefineId: number): Observable<Message<AlertDefineBind[]>> {
    return this.http.get<Message<AlertDefineBind[]>>(`${alert_define_uri}/${alertDefineId}/monitors`);
  }

  public deleteAlertDefines(alertDefineIds: Set<number>): Observable<Message<any>> {
    let httpParams = new HttpParams();
    alertDefineIds.forEach(alertDefineId => {
      // 注意HttpParams是不可变对象 需要保存append后返回的对象为最新对象
      // append方法可以叠加同一key, set方法会把key之前的值覆盖只留一个key-value
      httpParams = httpParams.append('ids', alertDefineId);
    });
    const options = { params: httpParams };
    return this.http.delete<Message<any>>(alert_defines_uri, options);
  }

  public getAlertDefines(search: string | undefined, pageIndex: number, pageSize: number): Observable<Message<Page<AlertDefine>>> {
    pageIndex = pageIndex ? pageIndex : 0;
    pageSize = pageSize ? pageSize : 8;
    // 注意HttpParams是不可变对象 需要保存set后返回的对象为最新对象
    let httpParams = new HttpParams();
    httpParams = httpParams.appendAll({
      sort: 'id',
      order: 'desc',
      pageIndex: pageIndex,
      pageSize: pageSize
    });
    if (search != undefined && search.trim() != '') {
      httpParams = httpParams.append('search', search.trim());
    }
    const options = { params: httpParams };
    return this.http.get<Message<Page<AlertDefine>>>(alert_defines_uri, options);
  }

  public exportAlertDefines(defineIds: Set<number>, type: string): Observable<HttpResponse<Blob>> {
    let httpParams = new HttpParams();
    defineIds.forEach(defineId => {
      // 注意HttpParams是不可变对象 需要保存append后返回的对象为最新对象
      // append方法可以叠加同一key, set方法会把key之前的值覆盖只留一个key-value
      httpParams = httpParams.append('ids', defineId);
    });
    httpParams = httpParams.append('type', type);
    return this.http.get(export_defines_uri, {
      params: httpParams,
      observe: 'response',
      responseType: 'blob'
    });
  }
}
