import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AlertSilence } from '../pojo/AlertSilence';
import { Message } from '../pojo/Message';
import { Page } from '../pojo/Page';

const alert_silence_uri = '/alert/silence';
const alert_silences_uri = '/alert/silences';

@Injectable({
  providedIn: 'root'
})
export class AlertSilenceService {
  constructor(private http: HttpClient) {}

  public newAlertSilence(body: AlertSilence): Observable<Message<any>> {
    return this.http.post<Message<any>>(alert_silence_uri, body);
  }

  public editAlertSilence(body: AlertSilence): Observable<Message<any>> {
    return this.http.put<Message<any>>(alert_silence_uri, body);
  }

  public getAlertSilence(silenceId: number): Observable<Message<AlertSilence>> {
    return this.http.get<Message<AlertSilence>>(`${alert_silence_uri}/${silenceId}`);
  }

  public deleteAlertSilences(silenceIds: Set<number>): Observable<Message<any>> {
    let httpParams = new HttpParams();
    silenceIds.forEach(silenceId => {
      // 注意HttpParams是不可变对象 需要保存append后返回的对象为最新对象
      // append方法可以叠加同一key, set方法会把key之前的值覆盖只留一个key-value
      httpParams = httpParams.append('ids', silenceId);
    });
    const options = { params: httpParams };
    return this.http.delete<Message<any>>(alert_silences_uri, options);
  }

  public getAlertSilences(search: string, pageIndex: number, pageSize: number): Observable<Message<Page<AlertSilence>>> {
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
    return this.http.get<Message<Page<AlertSilence>>>(alert_silences_uri, options);
  }
}
