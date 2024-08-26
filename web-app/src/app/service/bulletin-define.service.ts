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

import { BulletinDefine } from '../pojo/BulletinDefine';
import { Message } from '../pojo/Message';
import { Monitor } from '../pojo/Monitor';
import { Page } from '../pojo/Page';

const bulletin_define_uri = '/bulletin';

@Injectable({
  providedIn: 'root'
})
export class BulletinDefineService {
  constructor(private http: HttpClient) {}

  public newBulletinDefine(body: BulletinDefine) {
    return this.http.post<Message<any>>(bulletin_define_uri, body);
  }

  public editBulletinDefine(body: BulletinDefine) {
    return this.http.put<Message<any>>(bulletin_define_uri, body);
  }

  public getBulletinDefine(name: string) {
    return this.http.get<Message<any>>(`${bulletin_define_uri}/${name}`);
  }

  public deleteBulletinDefines(names: string[]): Observable<Message<any>> {
    let params = new HttpParams();
    names.forEach(name => {
      params = params.append('names', name);
    });

    return this.http.delete<Message<any>>(bulletin_define_uri, { params });
  }

  public getMonitorMetricsData(
    name: string,
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
      name: name,
      pageIndex: pageIndex,
      pageSize: pageSize
    });
    if (sortField != null && sortOrder != null) {
      httpParams = httpParams.appendAll({
        sort: sortField,
        order: sortOrder == 'ascend' ? 'asc' : 'desc'
      });
    }
    const options = { params: httpParams };
    return this.http.get<Message<any>>(`${bulletin_define_uri}/metrics`, options);
  }

  public getAllNames(): Observable<Message<string[]>> {
    return this.http.get<Message<string[]>>(`${bulletin_define_uri}/names`);
  }
}
