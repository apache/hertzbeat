import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from "@angular/common/http";
import {Observable} from "rxjs";
import {Message} from "../pojo/Message";
import {Page} from "../pojo/Page";
import {Monitor} from "../pojo/Monitor";

const monitor_uri = "/monitor";
const monitors_uri = "/monitors";
const detect_monitor_uri = "/monitor/detect"

@Injectable({
  providedIn: 'root'
})
export class MonitorService {

  constructor(private http : HttpClient) { }

  public newMonitor(body: any) : Observable<Message<any>> {
    return this.http.post<Message<any>>(monitor_uri, body);
  }

  public editMonitor(body: any) : Observable<Message<any>> {
    return this.http.put<Message<any>>(monitor_uri, body);
  }

  public deleteMonitor(monitorId: number) : Observable<Message<any>> {
    return this.http.delete<Message<any>>(`${monitor_uri}/${monitorId}`);
  }

  public deleteMonitors(monitorIds: Set<number>) : Observable<Message<any>> {
    let httpParams = new HttpParams();
    monitorIds.forEach(monitorId => {
      // 注意HttpParams是不可变对象 需要保存set后返回的对象为最新对象
      httpParams = httpParams.set('ids', monitorId);
    })
    const options = { params: httpParams };
    return this.http.delete<Message<any>>(monitors_uri, options);
  }

  public detectMonitor(body: any) : Observable<Message<any>> {
    return this.http.post<Message<any>>(detect_monitor_uri, body);
  }

  public getMonitor(monitorId: number) : Observable<Message<any>> {
    return this.http.get<Message<any>>(`${monitor_uri}/${monitorId}`);
  }

  public getMonitors(app: string, pageIndex: number, pageSize: number) : Observable<Message<Page<Monitor>>> {
    app = app.trim();
    pageIndex = pageIndex ? 1 : pageIndex;
    pageSize = pageSize ? 10 : pageSize;
    // 注意HttpParams是不可变对象 需要保存set后返回的对象为最新对象
    let httpParams = new HttpParams();
    httpParams = httpParams.appendAll({
      'app': app,
      'pageIndex': pageIndex,
      'pageSize': pageSize
    });
    const options = { params: httpParams };
    return this.http.get<Message<Page<Monitor>>>(monitors_uri, options);
  }

}
