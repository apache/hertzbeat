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

import { AlertGroupConverge } from '../pojo/AlertGroupConverge';
import { Message } from '../pojo/Message';
import { Page } from '../pojo/Page';

const alert_group_uri = '/alert/group';
const alert_groups_uri = '/alert/groups';

@Injectable({
  providedIn: 'root'
})
export class AlertGroupService {
  constructor(private http: HttpClient) {}

  public newAlertGroupConverge(body: AlertGroupConverge): Observable<Message<any>> {
    return this.http.post<Message<any>>(alert_group_uri, body);
  }

  public editAlertGroupConverge(body: AlertGroupConverge): Observable<Message<any>> {
    return this.http.put<Message<any>>(alert_group_uri, body);
  }

  public getAlertGroupConverge(convergeId: number): Observable<Message<AlertGroupConverge>> {
    return this.http.get<Message<AlertGroupConverge>>(`${alert_group_uri}/${convergeId}`);
  }

  public deleteAlertGroupConverges(convergeIds: Set<number>): Observable<Message<any>> {
    let httpParams = new HttpParams();
    convergeIds.forEach(convergeId => {
      // HttpParams is unmodifiable, so we need to save the return value of append/set
      // Method append can append same key, set will replace the previous value
      httpParams = httpParams.append('ids', convergeId);
    });
    const options = { params: httpParams };
    return this.http.delete<Message<any>>(alert_groups_uri, options);
  }

  public getAlertGroupConverges(search: string, pageIndex: number, pageSize: number): Observable<Message<Page<AlertGroupConverge>>> {
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
    return this.http.get<Message<Page<AlertGroupConverge>>>(alert_groups_uri, options);
  }
}
