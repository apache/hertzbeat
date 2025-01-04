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

import { AlertInhibit } from '../pojo/AlertInhibit';
import { Message } from '../pojo/Message';
import { Page } from '../pojo/Page';

const alert_inhibit_uri = '/alert/inhibit';
const alert_inhibits_uri = '/alert/inhibits';

@Injectable({
  providedIn: 'root'
})
export class AlertInhibitService {
  constructor(private http: HttpClient) {}

  public newAlertInhibit(body: AlertInhibit): Observable<Message<any>> {
    return this.http.post<Message<any>>(alert_inhibit_uri, body);
  }

  public editAlertInhibit(body: AlertInhibit): Observable<Message<any>> {
    return this.http.put<Message<any>>(alert_inhibit_uri, body);
  }

  public getAlertInhibit(silenceId: number): Observable<Message<AlertInhibit>> {
    return this.http.get<Message<AlertInhibit>>(`${alert_inhibit_uri}/${silenceId}`);
  }

  public deleteAlertInhibits(silenceIds: Set<number>): Observable<Message<any>> {
    let httpParams = new HttpParams();
    silenceIds.forEach(silenceId => {
      // HttpParams is unmodifiable, so we need to save the return value of append/set
      // Method append can append same key, set will replace the previous value
      httpParams = httpParams.append('ids', silenceId);
    });
    const options = { params: httpParams };
    return this.http.delete<Message<any>>(alert_inhibits_uri, options);
  }

  public getAlertInhibits(search: string, pageIndex: number, pageSize: number): Observable<Message<Page<AlertInhibit>>> {
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
    return this.http.get<Message<Page<AlertInhibit>>>(alert_inhibits_uri, options);
  }
}
