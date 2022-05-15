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

  public getAppDefine(app: string | undefined | null): Observable<Message<any>> {
    if (app === null || app === undefined) {
      console.log('getAppDefine app can not null');
    }
    return this.http.get<Message<any>>(`/apps/${app}/define`);
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
