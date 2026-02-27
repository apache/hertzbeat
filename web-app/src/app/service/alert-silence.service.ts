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

import { AlertSilence } from '../pojo/AlertSilence';
import { Message } from '../pojo/Message';
import { Page } from '../pojo/Page';

const alert_silence_uri = '/alert/silence';
const alert_silences_uri = '/alert/silences';

@Injectable({
  providedIn: 'root'
})
export class AlertSilenceService {
  constructor(private http: HttpClient) {}

  public newAlertSilence(body: AlertSilence): Observable<Message<any>> {
    return this.http.post<Message<any>>(alert_silence_uri, body);
  }

  public editAlertSilence(body: AlertSilence): Observable<Message<any>> {
    return this.http.put<Message<any>>(alert_silence_uri, body);
  }

  public getAlertSilence(silenceId: number): Observable<Message<AlertSilence>> {
    return this.http.get<Message<AlertSilence>>(`${alert_silence_uri}/${silenceId}`);
  }

  public deleteAlertSilences(silenceIds: Set<number>): Observable<Message<any>> {
    let httpParams = new HttpParams();
    silenceIds.forEach(silenceId => {
      // HttpParams is unmodifiable, so we need to save the return value of append/set
      // Method append can append same key, set will replace the previous value
      httpParams = httpParams.append('ids', silenceId);
    });
    const options = { params: httpParams };
    return this.http.delete<Message<any>>(alert_silences_uri, options);
  }

  public getAlertSilences(search: string, pageIndex: number, pageSize: number): Observable<Message<Page<AlertSilence>>> {
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
    return this.http.get<Message<Page<AlertSilence>>>(alert_silences_uri, options);
  }
}
