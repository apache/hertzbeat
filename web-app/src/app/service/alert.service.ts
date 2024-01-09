import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Alert } from '../pojo/Alert';
import { Message } from '../pojo/Message';
import { Page } from '../pojo/Page';

const alerts_uri = '/alerts';
const alerts_clear_uri = '/alerts/clear';
const alerts_summary_uri = '/alerts/summary';
const alerts_status_uri = '/alerts/status';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  constructor(private http: HttpClient) {}

  public loadAlerts(
    status: number | undefined,
    priority: number | undefined,
    content: string | undefined,
    pageIndex: number,
    pageSize: number
  ): Observable<Message<Page<Alert>>> {
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
    if (status != undefined && status != 9) {
      httpParams = httpParams.append('status', status);
    }
    if (priority != undefined && priority != 9) {
      httpParams = httpParams.append('priority', priority);
    }
    if (content != undefined && content != '' && content.trim() != '') {
      httpParams = httpParams.append('content', content.trim());
    }
    const options = { params: httpParams };
    return this.http.get<Message<Page<Alert>>>(alerts_uri, options);
  }

  public deleteAlerts(alertIds: Set<number>): Observable<Message<any>> {
    let httpParams = new HttpParams();
    alertIds.forEach(alertId => {
      // 注意HttpParams是不可变对象 需要保存append后返回的对象为最新对象
      // append方法可以叠加同一key, set方法会把key之前的值覆盖只留一个key-value
      httpParams = httpParams.append('ids', alertId);
    });
    const options = { params: httpParams };
    return this.http.delete<Message<any>>(alerts_uri, options);
  }

  public clearAlerts(): Observable<Message<any>> {
    return this.http.delete<Message<any>>(alerts_clear_uri);
  }

  public applyAlertsStatus(alertIds: Set<number>, status: number): Observable<Message<any>> {
    let httpParams = new HttpParams();
    alertIds.forEach(alertId => {
      // 注意HttpParams是不可变对象 需要保存append后返回的对象为最新对象
      // append方法可以叠加同一key, set方法会把key之前的值覆盖只留一个key-value
      httpParams = httpParams.append('ids', alertId);
    });
    const options = { params: httpParams };
    return this.http.put<Message<any>>(`${alerts_status_uri}/${status}`, null, options);
  }

  public getAlertsSummary(): Observable<Message<any>> {
    return this.http.get<Message<any>>(alerts_summary_uri);
  }
}
