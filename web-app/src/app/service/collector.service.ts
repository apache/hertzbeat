import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CollectorSummary } from '../pojo/CollectorSummary';
import { Message } from '../pojo/Message';
import { Page } from '../pojo/Page';

const collector_uri = '/collector';

@Injectable({
  providedIn: 'root'
})
export class CollectorService {
  constructor(private http: HttpClient) {}

  public getCollectors(): Observable<Message<Page<CollectorSummary>>> {
    return this.http.get<Message<Page<CollectorSummary>>>(collector_uri);
  }

  public queryCollectors(search: string | undefined, pageIndex: number, pageSize: number): Observable<Message<Page<CollectorSummary>>> {
    pageIndex = pageIndex ? pageIndex : 0;
    pageSize = pageSize ? pageSize : 8;
    // 注意HttpParams是不可变对象 需要保存set后返回的对象为最新对象
    let httpParams = new HttpParams();
    httpParams = httpParams.appendAll({
      pageIndex: pageIndex,
      pageSize: pageSize
    });
    if (search != undefined && search != '' && search.trim() != '') {
      httpParams = httpParams.append('name', search.trim());
    }
    const options = { params: httpParams };
    return this.http.get<Message<Page<CollectorSummary>>>(collector_uri, options);
  }

  public goOnlineCollector(collectors: Set<string>): Observable<Message<any>> {
    let httpParams = new HttpParams();
    collectors.forEach(collector => {
      // 注意HttpParams是不可变对象 需要保存append后返回的对象为最新对象
      // append方法可以叠加同一key, set方法会把key之前的值覆盖只留一个key-value
      httpParams = httpParams.append('collectors', collector);
    });
    const options = { params: httpParams };
    return this.http.put<Message<any>>(`${collector_uri}/online/`, null, options);
  }

  public goOfflineCollector(collectors: Set<string>): Observable<Message<any>> {
    let httpParams = new HttpParams();
    collectors.forEach(collector => {
      // 注意HttpParams是不可变对象 需要保存append后返回的对象为最新对象
      // append方法可以叠加同一key, set方法会把key之前的值覆盖只留一个key-value
      httpParams = httpParams.append('collectors', collector);
    });
    const options = { params: httpParams };
    return this.http.put<Message<any>>(`${collector_uri}/offline/`, null, options);
  }

  public deleteCollector(collectors: Set<string>): Observable<Message<any>> {
    let httpParams = new HttpParams();
    collectors.forEach(collector => {
      // 注意HttpParams是不可变对象 需要保存append后返回的对象为最新对象
      // append方法可以叠加同一key, set方法会把key之前的值覆盖只留一个key-value
      httpParams = httpParams.append('collectors', collector);
    });
    const options = { params: httpParams };
    return this.http.delete<Message<any>>(`${collector_uri}`, options);
  }

  public generateCollectorIdentity(collector: string): Observable<Message<any>> {
    return this.http.post<Message<any>>(`${collector_uri}/generate/${collector}`, null);
  }
}
