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

  public deleteBulletinDefines(names: string[]): Observable<Message<any>> {
    let params = new HttpParams();
    names.forEach(name => {
      params = params.append('names', name);
    });

    return this.http.delete<Message<any>>(bulletin_define_uri, { params });
  }

  public getAllMonitorMetricsData(): Observable<Message<any>> {
    return this.http.get<Message<any>>(`${bulletin_define_uri}/metrics`);
  }


}
