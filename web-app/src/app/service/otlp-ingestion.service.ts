/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.
 * The ASF licenses this file to you under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.
 * See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Message } from '../pojo/Message';
import {
  OtlpEntityBindingSummary,
  OtlpIngestionGuide,
  OtlpIngestionOverview,
  OtlpMetricsConsole,
  OtlpMetricsConsoleQueryParams
} from '../pojo/OtlpIngestion';

const otlpIngestionUri = '/ingestion/otlp';

@Injectable({
  providedIn: 'root'
})
export class OtlpIngestionService {
  constructor(private http: HttpClient) {}

  public getOverview(): Observable<Message<OtlpIngestionOverview>> {
    return this.http.get<Message<OtlpIngestionOverview>>(`${otlpIngestionUri}/overview`);
  }

  public getGuide(): Observable<Message<OtlpIngestionGuide>> {
    return this.http.get<Message<OtlpIngestionGuide>>(`${otlpIngestionUri}/guide`);
  }

  public getBindings(): Observable<Message<OtlpEntityBindingSummary>> {
    return this.http.get<Message<OtlpEntityBindingSummary>>(`${otlpIngestionUri}/bindings`);
  }

  public getMetricsConsole(params: OtlpMetricsConsoleQueryParams): Observable<Message<OtlpMetricsConsole>> {
    const normalizedParams: Record<string, string | number> = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value == null || value === '') {
        return;
      }
      normalizedParams[key] = value;
    });
    return this.http.get<Message<OtlpMetricsConsole>>(`${otlpIngestionUri}/metrics/console`, {
      params: normalizedParams
    });
  }
}
