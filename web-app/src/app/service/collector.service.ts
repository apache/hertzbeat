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

import { CollectorSummary } from '../pojo/CollectorSummary';
import { Message } from '../pojo/Message';
import { Page } from '../pojo/Page';

const collector_uri = '/collector';

@Injectable({
  providedIn: 'root'
})
export class CollectorService {
  constructor(private http: HttpClient) {}

  public getCollectors(): Observable<Message<Page<CollectorSummary>>> {
    return this.http.get<Message<Page<CollectorSummary>>>(collector_uri);
  }

  public queryCollectors(search: string | undefined, pageIndex: number, pageSize: number): Observable<Message<Page<CollectorSummary>>> {
    pageIndex = pageIndex ? pageIndex : 0;
    pageSize = pageSize ? pageSize : 8;
    // HttpParams is unmodifiable, so we need to save the return value of append/set
    let httpParams = new HttpParams();
    httpParams = httpParams.appendAll({
      pageIndex: pageIndex,
      pageSize: pageSize
    });
    if (search != undefined && search != '' && search.trim() != '') {
      httpParams = httpParams.append('name', search.trim());
    }
    const options = { params: httpParams };
    return this.http.get<Message<Page<CollectorSummary>>>(collector_uri, options);
  }

  public goOnlineCollector(collectors: Set<string>): Observable<Message<any>> {
    let httpParams = new HttpParams();
    collectors.forEach(collector => {
      // HttpParams is unmodifiable, so we need to save the return value of append/set
      // Method append can append same key, set will replace the previous value
      httpParams = httpParams.append('collectors', collector);
    });
    const options = { params: httpParams };
    return this.http.put<Message<any>>(`${collector_uri}/online`, null, options);
  }

  public goOfflineCollector(collectors: Set<string>): Observable<Message<any>> {
    let httpParams = new HttpParams();
    collectors.forEach(collector => {
      // HttpParams is unmodifiable, so we need to save the return value of append/set
      // Method append can append same key, set will replace the previous value
      httpParams = httpParams.append('collectors', collector);
    });
    const options = { params: httpParams };
    return this.http.put<Message<any>>(`${collector_uri}/offline`, null, options);
  }

  public deleteCollector(collectors: Set<string>): Observable<Message<any>> {
    let httpParams = new HttpParams();
    collectors.forEach(collector => {
      // HttpParams is unmodifiable, so we need to save the return value of append/set
      // Method append can append same key, set will replace the previous value
      httpParams = httpParams.append('collectors', collector);
    });
    const options = { params: httpParams };
    return this.http.delete<Message<any>>(`${collector_uri}`, options);
  }

  public generateCollectorIdentity(collector: string): Observable<Message<any>> {
    return this.http.post<Message<any>>(`${collector_uri}/generate/${collector}`, null);
  }
}
