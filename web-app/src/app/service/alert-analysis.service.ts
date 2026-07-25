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

import { Message } from '../pojo/Message';
import { Page } from '../pojo/Page';
import { AgentSession, AgentTranscriptEntry } from './ai-chat.service';

export interface AlertAnalysisPolicy {
  id: number;
  name: string;
  enabled: boolean;
  matchLabels: Record<string, string>;
  groupByLabels: string[];
  windowSeconds: number;
  minimumAlertCount: number;
  cooldownSeconds: number;
  gmtCreate: string;
  gmtUpdate: string;
}

export interface AlertAnalysisPolicyRequest {
  name: string;
  matchLabels: Record<string, string>;
  groupByLabels: string[];
  windowSeconds: number;
  minimumAlertCount: number;
  cooldownSeconds: number;
}

@Injectable({ providedIn: 'root' })
export class AlertAnalysisService {
  private readonly alertAnalysisUri = '/alert/analysis';
  private readonly alertAnalysisSessionUri = '/agent/alert-analysis/sessions';

  constructor(private http: HttpClient) {}

  getSessions(search: string, pageIndex: number, pageSize: number): Observable<Message<Page<AgentSession>>> {
    let params = new HttpParams().set('pageIndex', pageIndex).set('pageSize', pageSize);
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<Message<Page<AgentSession>>>(this.alertAnalysisSessionUri, { params });
  }

  getSessionTranscript(sessionUid: string): Observable<Message<Page<AgentTranscriptEntry>>> {
    const params = new HttpParams().set('pageIndex', 0).set('pageSize', 200);
    return this.http.get<Message<Page<AgentTranscriptEntry>>>(`/agent/sessions/${encodeURIComponent(sessionUid)}/transcript`, { params });
  }

  getPolicies(): Observable<Message<AlertAnalysisPolicy[]>> {
    return this.http.get<Message<AlertAnalysisPolicy[]>>(`${this.alertAnalysisUri}/policies`);
  }

  isAgentClientConfigured(): Observable<Message<boolean>> {
    return this.http.get<Message<boolean>>(`${this.alertAnalysisUri}/availability`);
  }

  createPolicy(request: AlertAnalysisPolicyRequest): Observable<Message<AlertAnalysisPolicy>> {
    return this.http.post<Message<AlertAnalysisPolicy>>(`${this.alertAnalysisUri}/policies`, request);
  }

  togglePolicy(policyId: number, enabled: boolean): Observable<Message<AlertAnalysisPolicy>> {
    const params = new HttpParams().set('enabled', enabled);
    return this.http.put<Message<AlertAnalysisPolicy>>(`${this.alertAnalysisUri}/policies/${policyId}/enabled`, null, { params });
  }

  deletePolicy(policyId: number): Observable<Message<void>> {
    return this.http.delete<Message<void>>(`${this.alertAnalysisUri}/policies/${policyId}`);
  }
}
