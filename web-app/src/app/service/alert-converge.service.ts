import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AlertConverge } from '../pojo/AlertConverge';
import { Message } from '../pojo/Message';
import { Page } from '../pojo/Page';

const alert_converge_uri = '/alert/converge';
const alert_converges_uri = '/alert/converges';

@Injectable({
  providedIn: 'root'
})
export class AlertConvergeService {
  constructor(private http: HttpClient) {}

  public newAlertConverge(body: AlertConverge): Observable<Message<any>> {
    return this.http.post<Message<any>>(alert_converge_uri, body);
  }

  public editAlertConverge(body: AlertConverge): Observable<Message<any>> {
    return this.http.put<Message<any>>(alert_converge_uri, body);
  }

  public getAlertConverge(convergeId: number): Observable<Message<AlertConverge>> {
    return this.http.get<Message<AlertConverge>>(`${alert_converge_uri}/${convergeId}`);
  }

  public deleteAlertConverges(convergeIds: Set<number>): Observable<Message<any>> {
    let httpParams = new HttpParams();
    convergeIds.forEach(convergeId => {
      // 注意HttpParams是不可变对象 需要保存append后返回的对象为最新对象
      // append方法可以叠加同一key, set方法会把key之前的值覆盖只留一个key-value
      httpParams = httpParams.append('ids', convergeId);
    });
    const options = { params: httpParams };
    return this.http.delete<Message<any>>(alert_converges_uri, options);
  }

  public getAlertConverges(search: string, pageIndex: number, pageSize: number): Observable<Message<Page<AlertConverge>>> {
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
    return this.http.get<Message<Page<AlertConverge>>>(alert_converges_uri, options);
  }
}
