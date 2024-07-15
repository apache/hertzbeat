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

import {Injectable} from "@angular/core";
import {HttpClient, HttpParams} from "@angular/common/http";
import {Observable} from "rxjs";
import {Message} from "../pojo/Message";
import {Page} from "../pojo/Page";
import {AlertDefine} from "../pojo/AlertDefine";
import {BulletinDefine} from "../pojo/BulletinDefine";

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

  public getBulletinDefine(bulletinDefineId: number): Observable<Message<BulletinDefine>> {
    return this.http.get<Message<BulletinDefine>>(`${bulletin_define_uri}/${bulletinDefineId}`);
  }

  public deleteBulletinDefines(bulletinDefineIds: Set<number>): Observable<Message<any>> {
    let httpParams = new HttpParams();
    bulletinDefineIds.forEach(bulletinDefineId => {
      // 注意HttpParams是不可变对象 需要保存append后返回的对象为最新对象
      // append方法可以叠加同一key, set方法会把key之前的值覆盖只留一个key-value
      httpParams = httpParams.append('ids', bulletinDefineId);
    });
    const options = { params: httpParams };
    return this.http.delete<Message<any>>(bulletin_define_uri, options);
  }

  public getBulletinDefines(search: string | undefined, pageIndex: number, pageSize: number): Observable<Message<Page<BulletinDefine>>> {
    pageIndex = pageIndex ? pageIndex : 0;
    pageSize = pageSize ? pageSize : 8;
    // 注意HttpParams是不可变对象 需要保存set后返回的对象为最新对象
    let httpParams = new HttpParams();
    httpParams = httpParams.appendAll({
      sort: 'id',
      order: 'desc',
      pageIndex: pageIndex,
      pageSize: pageSize
    });
    if (search != undefined && search.trim() != '') {
      httpParams = httpParams.append('search', search.trim());
    }
    const options = { params: httpParams };
    return this.http.get<Message<Page<BulletinDefine>>>(bulletin_define_uri, options);
  }

  public deleteBulletinDefine() {
    console.log("deleteBulletinDefine");
  }

  public getMonitorMetricsData(bulletinId: number): Observable<Message<any>> {
    return this.http.get<Message<any>>(`${bulletin_define_uri}/metrics/${bulletinId}`);
  }

  public getAllMonitorMetricsData(): Observable<Message<any>> {
    return this.http.get<Message<any>>(`${bulletin_define_uri}/metrics`);
  }


}
