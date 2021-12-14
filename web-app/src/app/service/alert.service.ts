import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from "@angular/common/http";
import {Observable} from "rxjs";
import {Message} from "../pojo/Message";
import {Page} from "../pojo/Page";
import {Alert} from "../pojo/Alert";

const alerts_uri = '/alerts';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  constructor(private http : HttpClient) { }

  public getAlerts(pageIndex: number, pageSize: number) : Observable<Message<Page<Alert>>> {
    pageIndex = pageIndex ? pageIndex : 0;
    pageSize = pageSize ? pageSize : 8;
    // 注意HttpParams是不可变对象 需要保存set后返回的对象为最新对象
    let httpParams = new HttpParams();
    httpParams = httpParams.appendAll({
      'sort': 'id',
      'order': 'desc',
      'pageIndex': pageIndex,
      'pageSize': pageSize
    });
    const options = { params: httpParams };
    return this.http.get<Message<Page<Alert>>>(alerts_uri, options);
  }

  public deleteAlerts(alertIds: Set<number>) : Observable<Message<any>> {
    let httpParams = new HttpParams();
    alertIds.forEach(alertId => {
      // 注意HttpParams是不可变对象 需要保存append后返回的对象为最新对象
      // append方法可以叠加同一key, set方法会把key之前的值覆盖只留一个key-value
      httpParams = httpParams.append('ids', alertId);
    })
    const options = { params: httpParams };
    return this.http.delete<Message<any>>(alerts_uri, options);
  }

}
