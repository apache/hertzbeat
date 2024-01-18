import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Message } from '../pojo/Message';
import { Monitor } from '../pojo/Monitor';
import { Page } from '../pojo/Page';

const monitor_uri = '/monitor';
const monitors_uri = '/monitors';
const detect_monitor_uri = '/monitor/detect';
const manage_monitors_uri = '/monitors/manage';
const export_monitors_uri = '/monitors/export';
const summary_uri = '/summary';
const warehouse_storage_status_uri = '/warehouse/storage/status';

@Injectable({
  providedIn: 'root'
})
export class MonitorService {
  constructor(private http: HttpClient) {}

  public newMonitor(body: any): Observable<Message<any>> {
    return this.http.post<Message<any>>(monitor_uri, body);
  }

  public editMonitor(body: any): Observable<Message<any>> {
    return this.http.put<Message<any>>(monitor_uri, body);
  }

  public deleteMonitor(monitorId: number): Observable<Message<any>> {
    return this.http.delete<Message<any>>(`${monitor_uri}/${monitorId}`);
  }

  public deleteMonitors(monitorIds: Set<number>): Observable<Message<any>> {
    let httpParams = new HttpParams();
    monitorIds.forEach(monitorId => {
      // 注意HttpParams是不可变对象 需要保存append后返回的对象为最新对象
      // append方法可以叠加同一key, set方法会把key之前的值覆盖只留一个key-value
      httpParams = httpParams.append('ids', monitorId);
    });
    const options = { params: httpParams };
    return this.http.delete<Message<any>>(monitors_uri, options);
  }

  public exportMonitors(monitorIds: Set<number>, type: string): Observable<HttpResponse<Blob>> {
    let httpParams = new HttpParams();
    monitorIds.forEach(monitorId => {
      // 注意HttpParams是不可变对象 需要保存append后返回的对象为最新对象
      // append方法可以叠加同一key, set方法会把key之前的值覆盖只留一个key-value
      httpParams = httpParams.append('ids', monitorId);
    });
    httpParams = httpParams.append('type', type);
    return this.http.get(export_monitors_uri, {
      params: httpParams,
      observe: 'response',
      responseType: 'blob'
    });
  }

  public cancelManageMonitors(monitorIds: Set<number>): Observable<Message<any>> {
    let httpParams = new HttpParams();
    monitorIds.forEach(monitorId => {
      // 注意HttpParams是不可变对象 需要保存append后返回的对象为最新对象
      // append方法可以叠加同一key, set方法会把key之前的值覆盖只留一个key-value
      httpParams = httpParams.append('ids', monitorId);
      httpParams = httpParams.append('type', 'JSON');
    });
    const options = { params: httpParams };
    return this.http.delete<Message<any>>(manage_monitors_uri, options);
  }

  public enableManageMonitors(monitorIds: Set<number>): Observable<Message<any>> {
    let httpParams = new HttpParams();
    monitorIds.forEach(monitorId => {
      httpParams = httpParams.append('ids', monitorId);
    });
    const options = { params: httpParams };
    return this.http.get<Message<any>>(manage_monitors_uri, options);
  }

  public detectMonitor(body: any): Observable<Message<any>> {
    return this.http.post<Message<any>>(detect_monitor_uri, body);
  }

  public getMonitor(monitorId: number): Observable<Message<any>> {
    return this.http.get<Message<any>>(`${monitor_uri}/${monitorId}`);
  }

  public getMonitorsByApp(app: string): Observable<Message<Monitor[]>> {
    return this.http.get<Message<Monitor[]>>(`${monitors_uri}/${app}`);
  }

  public getMonitors(
    app: string | undefined,
    tag: string | undefined,
    pageIndex: number,
    pageSize: number,
    sortField?: string | null,
    sortOrder?: string | null
  ): Observable<Message<Page<Monitor>>> {
    pageIndex = pageIndex ? pageIndex : 0;
    pageSize = pageSize ? pageSize : 8;
    // 注意HttpParams是不可变对象 需要保存set后返回的对象为最新对象
    let httpParams = new HttpParams();
    httpParams = httpParams.appendAll({
      pageIndex: pageIndex,
      pageSize: pageSize
    });
    if (app != undefined) {
      httpParams = httpParams.append('app', app.trim());
    }
    if (tag != undefined) {
      httpParams = httpParams.append('tag', tag);
    }
    if (sortField != null && sortOrder != null) {
      httpParams = httpParams.appendAll({
        sort: sortField,
        order: sortOrder == 'ascend' ? 'asc' : 'desc'
      });
    }
    const options = { params: httpParams };
    return this.http.get<Message<Page<Monitor>>>(monitors_uri, options);
  }

  public searchMonitors(
    app: string | undefined,
    tag: string | undefined,
    searchValue: string,
    status: number,
    pageIndex: number,
    pageSize: number,
    sortField?: string | null,
    sortOrder?: string | null
  ): Observable<Message<Page<Monitor>>> {
    pageIndex = pageIndex ? pageIndex : 0;
    pageSize = pageSize ? pageSize : 8;
    // 注意HttpParams是不可变对象 需要保存set后返回的对象为最新对象
    let httpParams = new HttpParams();
    httpParams = httpParams.appendAll({
      pageIndex: pageIndex,
      pageSize: pageSize
    });
    if (tag != undefined) {
      httpParams = httpParams.append('tag', tag);
    }
    if (status != undefined && status != 9) {
      httpParams = httpParams.append('status', status);
    }
    if (app != undefined) {
      httpParams = httpParams.append('app', app);
    }
    if (sortField != null && sortOrder != null) {
      httpParams = httpParams.appendAll({
        sort: sortField,
        order: sortOrder == 'ascend' ? 'asc' : 'desc'
      });
    }
    if (searchValue != undefined && searchValue != '' && searchValue.trim() != '') {
      httpParams = httpParams.append('name', searchValue);
      httpParams = httpParams.append('host', searchValue);
    }
    const options = { params: httpParams };
    return this.http.get<Message<Page<Monitor>>>(monitors_uri, options);
  }

  public getMonitorMetricsData(monitorId: number, metrics: string): Observable<Message<any>> {
    return this.http.get<Message<any>>(`/monitor/${monitorId}/metrics/${metrics}`);
  }

  public getMonitorMetricHistoryData(
    monitorId: number,
    app: string,
    metrics: string,
    metric: string,
    history: string,
    interval: boolean
  ): Observable<Message<any>> {
    let metricFull = `${app}.${metrics}.${metric}`;
    let httpParams = new HttpParams();
    httpParams = httpParams.appendAll({
      history: history,
      interval: interval
    });
    const options = { params: httpParams };
    return this.http.get<Message<any>>(`/monitor/${monitorId}/metric/${metricFull}`, options);
  }

  public getAppsMonitorSummary(): Observable<Message<any>> {
    return this.http.get<Message<any>>(summary_uri);
  }

  public getWarehouseStorageServerStatus(): Observable<Message<any>> {
    return this.http.get<Message<any>>(warehouse_storage_status_uri);
  }
}
