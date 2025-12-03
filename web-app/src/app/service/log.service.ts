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

import { LogEntry } from '../pojo/LogEntry';
import { Message } from '../pojo/Message';
import { Page } from '../pojo/Page';

// endpoints
const logs_list_uri = '/logs/list';
const logs_stats_overview_uri = '/logs/stats/overview';
const logs_stats_trend_uri = '/logs/stats/trend';
const logs_stats_trace_coverage_uri = '/logs/stats/trace-coverage';
const logs_batch_delete_uri = '/logs';

@Injectable({ providedIn: 'root' })
export class LogService {
  constructor(private http: HttpClient) {}

  public list(
    start?: number,
    end?: number,
    traceId?: string,
    spanId?: string,
    severityNumber?: number,
    severityText?: string,
    pageIndex: number = 0,
    pageSize: number = 20
  ): Observable<Message<Page<LogEntry>>> {
    let params = new HttpParams();
    if (start != null) params = params.set('start', start);
    if (end != null) params = params.set('end', end);
    if (traceId) params = params.set('traceId', traceId);
    if (spanId) params = params.set('spanId', spanId);
    if (severityNumber != null) params = params.set('severityNumber', severityNumber);
    if (severityText) params = params.set('severityText', severityText);
    params = params.set('pageIndex', pageIndex);
    params = params.set('pageSize', pageSize);
    return this.http.get<Message<any>>(logs_list_uri, { params });
  }

  public overviewStats(
    start?: number,
    end?: number,
    traceId?: string,
    spanId?: string,
    severityNumber?: number,
    severityText?: string
  ): Observable<Message<any>> {
    let params = new HttpParams();
    if (start != null) params = params.set('start', start);
    if (end != null) params = params.set('end', end);
    if (traceId) params = params.set('traceId', traceId);
    if (spanId) params = params.set('spanId', spanId);
    if (severityNumber != null) params = params.set('severityNumber', severityNumber);
    if (severityText) params = params.set('severityText', severityText);
    return this.http.get<Message<any>>(logs_stats_overview_uri, { params });
  }

  public trendStats(
    start?: number,
    end?: number,
    traceId?: string,
    spanId?: string,
    severityNumber?: number,
    severityText?: string
  ): Observable<Message<any>> {
    let params = new HttpParams();
    if (start != null) params = params.set('start', start);
    if (end != null) params = params.set('end', end);
    if (traceId) params = params.set('traceId', traceId);
    if (spanId) params = params.set('spanId', spanId);
    if (severityNumber != null) params = params.set('severityNumber', severityNumber);
    if (severityText) params = params.set('severityText', severityText);
    return this.http.get<Message<any>>(logs_stats_trend_uri, { params });
  }

  public traceCoverageStats(
    start?: number,
    end?: number,
    traceId?: string,
    spanId?: string,
    severityNumber?: number,
    severityText?: string
  ): Observable<Message<any>> {
    let params = new HttpParams();
    if (start != null) params = params.set('start', start);
    if (end != null) params = params.set('end', end);
    if (traceId) params = params.set('traceId', traceId);
    if (spanId) params = params.set('spanId', spanId);
    if (severityNumber != null) params = params.set('severityNumber', severityNumber);
    if (severityText) params = params.set('severityText', severityText);
    return this.http.get<Message<any>>(logs_stats_trace_coverage_uri, { params });
  }

  public batchDelete(timeUnixNanos: number[]): Observable<Message<string>> {
    let httpParams = new HttpParams();
    timeUnixNanos.forEach(timeUnixNano => {
      httpParams = httpParams.append('timeUnixNanos', timeUnixNano);
    });
    const options = { params: httpParams };
    return this.http.delete<Message<string>>(logs_batch_delete_uri, options);
  }
}
