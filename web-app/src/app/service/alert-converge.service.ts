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

import { AlertConverge } from '../pojo/AlertConverge';
import { Message } from '../pojo/Message';
import { Page } from '../pojo/Page';

const alert_converge_uri = '/alert/converge';
const alert_converges_uri = '/alert/converges';

@Injectable({
  providedIn: 'root'
})
export class AlertConvergeService {
  constructor(private http: HttpClient) {}

  public newAlertConverge(body: AlertConverge): Observable<Message<any>> {
    return this.http.post<Message<any>>(alert_converge_uri, body);
  }

  public editAlertConverge(body: AlertConverge): Observable<Message<any>> {
    return this.http.put<Message<any>>(alert_converge_uri, body);
  }

  public getAlertConverge(convergeId: number): Observable<Message<AlertConverge>> {
    return this.http.get<Message<AlertConverge>>(`${alert_converge_uri}/${convergeId}`);
  }

  public deleteAlertConverges(convergeIds: Set<number>): Observable<Message<any>> {
    let httpParams = new HttpParams();
    convergeIds.forEach(convergeId => {
      // HttpParams is unmodifiable, so we need to save the return value of append/set
      // Method append can append same key, set will replace the previous value
      httpParams = httpParams.append('ids', convergeId);
    });
    const options = { params: httpParams };
    return this.http.delete<Message<any>>(alert_converges_uri, options);
  }

  public getAlertConverges(search: string, pageIndex: number, pageSize: number): Observable<Message<Page<AlertConverge>>> {
    pageIndex = pageIndex ? pageIndex : 0;
    pageSize = pageSize ? pageSize : 8;
    // HttpParams is unmodifiable, so we need to save the return value of append/set
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
    return this.http.get<Message<Page<AlertConverge>>>(alert_converges_uri, options);
  }
}
