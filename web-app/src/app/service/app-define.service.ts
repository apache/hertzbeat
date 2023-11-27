import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Message } from '../pojo/Message';
import { ParamDefine } from '../pojo/ParamDefine';

const app_hierarchy = '/apps/hierarchy';

@Injectable({
  providedIn: 'root'
})
export class AppDefineService {
  constructor(private http: HttpClient) {}

  public getAppParamsDefine(app: string | undefined | null): Observable<Message<ParamDefine[]>> {
    if (app === null || app === undefined) {
      console.log('getAppParamsDefine app can not null');
    }
    const paramDefineUri = `/apps/${app}/params`;
    return this.http.get<Message<ParamDefine[]>>(paramDefineUri);
  }

  public getPushDefine(monitorId: number | undefined | null): Observable<Message<any>> {
    if (monitorId === null || monitorId === undefined) {
      console.log('getPushDefine monitorId can not null');
    }
    return this.http.get<Message<any>>(`/apps/${monitorId}/pushdefine`);
  }

  public getAppDynamicDefine(monitorId: number | undefined | null): Observable<Message<any>> {
    if (monitorId === null || monitorId === undefined) {
      console.log('getAppDynamicDefine monitorId can not null');
    }
    return this.http.get<Message<any>>(`/apps/${monitorId}/define/dynamic`);
  }

  public getAppDefine(app: string | undefined | null): Observable<Message<any>> {
    if (app === null || app === undefined) {
      console.log('getAppDefine app can not null');
    }
    return this.http.get<Message<any>>(`/apps/${app}/define`);
  }

  public deleteAppDefine(app: string | undefined | null): Observable<Message<any>> {
    if (app === null || app === undefined) {
      console.log('deleteAppDefine app can not null');
    }
    return this.http.delete<Message<any>>(`/apps/${app}/define/yml`);
  }

  public getAppDefineYmlContent(app: string | undefined | null): Observable<Message<any>> {
    if (app === null || app === undefined) {
      console.log('getAppDefine app can not null');
    }
    return this.http.get<Message<any>>(`/apps/${app}/define/yml`);
  }

  public newAppDefineYmlContent(defineContent: string | undefined | null, isNew: boolean): Observable<Message<any>> {
    if (defineContent === null || defineContent === undefined) {
      console.log('defineContent can not null');
    }
    let body = {
      define: defineContent
    };
    if (isNew) {
      return this.http.post<Message<any>>(`/apps/define/yml`, body);
    } else {
      return this.http.put<Message<any>>(`/apps/define/yml`, body);
    }
  }

  public getAppHierarchy(lang: string | undefined): Observable<Message<any>> {
    if (lang == undefined) {
      lang = 'en_US';
    }
    let httpParams = new HttpParams().append('lang', lang);
    const options = { params: httpParams };
    return this.http.get<Message<any>>(app_hierarchy, options);
  }
}
