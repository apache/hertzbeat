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
import { AgentTranscriptEntry } from './ai-chat.service';

export interface AgentSchedule {
  id: number;
  name: string;
  instruction: string;
  cronExpression: string;
  enabled: boolean;
  sessionId?: number;
  receiverIds: number[];
  templateId?: number;
  lastTriggerAt?: number;
  nextTriggerAt?: number;
  gmtCreate: string;
  gmtUpdate: string;
}

export interface AgentScheduleRequest {
  name: string;
  instruction: string;
  cronExpression: string;
  enabled: boolean;
  receiverIds: number[];
  templateId?: number;
}

export interface AgentScheduleRun {
  id: number;
  runUid: string;
  messageId: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  resultSummary?: string;
  errorMessage?: string;
  gmtCreate: string;
}

@Injectable({
  providedIn: 'root'
})
export class AgentScheduleService {
  private readonly scheduleUri = '/agent/schedules';

  constructor(private http: HttpClient) {}

  list(pageIndex: number, pageSize: number): Observable<Message<Page<AgentSchedule>>> {
    const params = new HttpParams().set('pageIndex', pageIndex).set('pageSize', pageSize);
    return this.http.get<Message<Page<AgentSchedule>>>(this.scheduleUri, { params });
  }

  create(request: AgentScheduleRequest): Observable<Message<AgentSchedule>> {
    return this.http.post<Message<AgentSchedule>>(this.scheduleUri, request);
  }

  update(scheduleId: number, request: AgentScheduleRequest): Observable<Message<AgentSchedule>> {
    return this.http.put<Message<AgentSchedule>>(`${this.scheduleUri}/${scheduleId}`, request);
  }

  delete(scheduleId: number): Observable<Message<void>> {
    return this.http.delete<Message<void>>(`${this.scheduleUri}/${scheduleId}`);
  }

  toggle(scheduleId: number, enabled: boolean): Observable<Message<AgentSchedule>> {
    const params = new HttpParams().set('enabled', enabled);
    return this.http.patch<Message<AgentSchedule>>(`${this.scheduleUri}/${scheduleId}/enabled`, undefined, { params });
  }

  runNow(scheduleId: number): Observable<Message<AgentScheduleRun>> {
    return this.http.post<Message<AgentScheduleRun>>(`${this.scheduleUri}/${scheduleId}/run`, {});
  }

  transcript(scheduleId: number, pageIndex = 0, pageSize = 20): Observable<Message<Page<AgentTranscriptEntry>>> {
    const params = new HttpParams().set('pageIndex', pageIndex).set('pageSize', pageSize);
    return this.http.get<Message<Page<AgentTranscriptEntry>>>(`${this.scheduleUri}/${scheduleId}/transcript`, { params });
  }
}
