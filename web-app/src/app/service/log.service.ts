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

export interface LogQueryOptions {
  start?: number;
  end?: number;
  traceId?: string;
  spanId?: string;
  severityNumber?: number;
  severityText?: string;
  search?: string;
  serviceName?: string;
  serviceNamespace?: string;
  environment?: string;
  resource?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface LogOverviewStats {
  totalCount: number;
  errorCount: number;
  warnCount: number;
  traceCoverage?: {
    withTrace: number;
  };
}

@Injectable({ providedIn: 'root' })
export class LogService {
  constructor(private http: HttpClient) {}

  list(options: LogQueryOptions): Observable<Message<Page<LogEntry>>> {
    return this.http.get<Message<Page<LogEntry>>>('/logs/list', { params: this.params(options) });
  }

  overviewStats(options: LogQueryOptions): Observable<Message<LogOverviewStats>> {
    return this.http.get<Message<LogOverviewStats>>('/logs/stats/overview', { params: this.params(options) });
  }

  trendStats(options: LogQueryOptions): Observable<Message<{ hourlyStats: Record<string, number> }>> {
    return this.http.get<Message<{ hourlyStats: Record<string, number> }>>('/logs/stats/trend', {
      params: this.params(options)
    });
  }

  batchDelete(timeUnixNanos: number[]): Observable<Message<string>> {
    let params = new HttpParams();
    timeUnixNanos.forEach(value => (params = params.append('timeUnixNanos', value)));
    return this.http.delete<Message<string>>('/logs', { params });
  }

  private params(options: LogQueryOptions): HttpParams {
    let params = new HttpParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value != null && value !== '') params = params.set(key, value);
    });
    return params;
  }
}
