import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from "@angular/common/http";
import {Observable} from "rxjs";
import {Message} from "../pojo/Message";
import {Page} from "../pojo/Page";
import {AlertDefine} from "../pojo/AlertDefine";

const alert_define_uri = "/alert/define";
const alert_defines_uri = "/alert/defines";

@Injectable({
  providedIn: 'root'
})
export class AlertDefineService {

  constructor(private http : HttpClient) { }

  public newAlertDefine(body: AlertDefine) : Observable<Message<any>> {
    return this.http.post<Message<any>>(alert_define_uri, body);
  }

  public editAlertDefine(body: AlertDefine) : Observable<Message<any>> {
    return this.http.put<Message<any>>(alert_define_uri, body);
  }

  public getAlertDefine(alertDefineId: number) : Observable<Message<AlertDefine>> {
    return this.http.get<Message<AlertDefine>>(`${alert_define_uri}/${alertDefineId}`);
  }

  /**
   * 应用告警定义与监控关联
   * @param alertDefineId 告警定义ID
   * @param monitorMap 关联的监控ID-监控名称
   */
  public applyAlertDefineMonitorsBind(alertDefineId: number,
                                      monitorMap: Record<number, string>): Observable<Message<AlertDefine>> {
    return this.http.post<Message<AlertDefine>>(`${alert_define_uri}/${alertDefineId}/monitors`, monitorMap);
  }

  public deleteAlertDefines(alertDefineIds: Set<number>) : Observable<Message<any>> {
    let httpParams = new HttpParams();
    alertDefineIds.forEach(alertDefineId => {
      // 注意HttpParams是不可变对象 需要保存append后返回的对象为最新对象
      // append方法可以叠加同一key, set方法会把key之前的值覆盖只留一个key-value
      httpParams = httpParams.append('ids', alertDefineId);
    })
    const options = { params: httpParams };
    return this.http.delete<Message<any>>(alert_defines_uri, options);
  }

  public getAlertDefines(pageIndex: number, pageSize: number) : Observable<Message<Page<AlertDefine>>> {
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
    return this.http.get<Message<Page<AlertDefine>>>(alert_defines_uri, options);
  }

}
