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

  public deleteBulletinDefines(ids: number[]): Observable<Message<any>> {
    let params = new HttpParams();
    ids.forEach(name => {
      params = params.append('ids', name);
    });
    return this.http.delete<Message<any>>(bulletin_define_uri, { params });
  }

  public getMonitorMetricsData(id: number): Observable<Message<Page<Monitor>>> {
    let httpParams = new HttpParams();
    httpParams = httpParams.appendAll({
      id: id
    });
    const options = { params: httpParams };
    return this.http.get<Message<any>>(`${bulletin_define_uri}/metrics`, options);
  }

  public queryBulletins(): Observable<Message<any>> {
    return this.http.get<Message<string[]>>(`${bulletin_define_uri}`);
  }
}
