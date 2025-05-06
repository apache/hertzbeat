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
import { Page } from '../pojo/Page';
import { Plugin } from '../pojo/Plugin';

const plugin_uri = '/plugin';

@Injectable({
  providedIn: 'root'
})
export class PluginService {
  constructor(private http: HttpClient) {}

  public loadPlugins(
    search: string | undefined,
    type: number | undefined,
    pageIndex: number,
    pageSize: number
  ): Observable<Message<Page<Plugin>>> {
    pageIndex = pageIndex ? pageIndex : 0;
    pageSize = pageSize ? pageSize : 8;
    // HttpParams is unmodifiable, so we need to save the return value of append/set
    let httpParams = new HttpParams();
    httpParams = httpParams.appendAll({
      pageIndex: pageIndex,
      pageSize: pageSize
    });
    if (search != undefined && search != '' && search.trim() != '') {
      httpParams = httpParams.append('search', search.trim());
    }
    const options = { params: httpParams };
    return this.http.get<Message<Page<Plugin>>>(plugin_uri, options);
  }

  public uploadPlugin(body: FormData): Observable<Message<any>> {
    return this.http.post<Message<any>>(plugin_uri, body);
  }

  public updatePluginStatus(body: Plugin): Observable<Message<any>> {
    body.enableStatus = !body.enableStatus;
    return this.http.put<Message<any>>(plugin_uri, body);
  }

  public deletePlugins(pluginIds: Set<number>): Observable<Message<any>> {
    let httpParams = new HttpParams();
    pluginIds.forEach(pluginId => {
      httpParams = httpParams.append('ids', pluginId);
    });
    const options = { params: httpParams };
    return this.http.delete<Message<any>>(plugin_uri, options);
  }

  public getPluginParamDefine(pluginId: number): Observable<Message<any>> {
    let httpParams = new HttpParams();
    httpParams = httpParams.appendAll({
      pluginMetadataId: pluginId
    });
    const options = { params: httpParams };
    return this.http.get<Message<any>>(`${plugin_uri}/params/define`, options);
  }

  public savePluginParamDefine(body: any): Observable<Message<any>> {
    return this.http.post<Message<any>>(`${plugin_uri}/params`, body);
  }
}
