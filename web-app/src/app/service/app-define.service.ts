/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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

  public getAppHierarchyByName(lang: string | undefined, app: string): Observable<Message<any>> {
    if (lang == undefined) {
      lang = 'en_US';
    }
    let httpParams = new HttpParams().append('lang', lang);
    const options = { params: httpParams };
    return this.http.get<Message<any>>(`${app_hierarchy}/${app}`, options);
  }

  public getAppDefines(lang: string | undefined): Observable<Message<any>> {
    if (lang == undefined) {
      lang = 'en_US';
    }
    let httpParams = new HttpParams().append('lang', lang);
    const options = { params: httpParams };
    return this.http.get<Message<any>>(`/apps/defines`, options);
  }
}
