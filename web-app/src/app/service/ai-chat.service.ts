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

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';

import { Message } from '../pojo/Message';
import { LocalStorageService } from './local-storage.service';

export type GatewayEventType =
  | 'RUN_STARTED'
  | 'MESSAGE_STARTED'
  | 'MESSAGE_DELTA'
  | 'MESSAGE_COMPLETED'
  | 'TOOL_STARTED'
  | 'TOOL_COMPLETED'
  | 'INPUT_REQUESTED'
  | 'INPUT_COMPLETED'
  | 'APPROVAL_REQUESTED'
  | 'APPROVAL_COMPLETED'
  | 'RUN_COMPLETED'
  | 'ERROR';

export interface GatewayEvent {
  type: GatewayEventType;
  eventId: string;
  conversationId?: string;
  sessionUid?: string;
  runUid?: string;
  itemId?: string;
  payload: {
    delta?: string;
    approvalId?: string;
    toolName?: string;
    arguments?: Record<string, unknown>;
    errorMessage?: string;
    [key: string]: unknown;
  };
  timestamp: number;
}

export interface AgentSession {
  id: number;
  sessionUid: string;
  conversationId: string;
  status: string;
  title: string;
  gmtCreate: string;
  gmtUpdate: string;
}

export interface AgentTranscriptEntry {
  id: number;
  runId?: number;
  sessionSequence: number;
  messageRole?: string;
  payloadJson: string;
  gmtCreate: string;
}

export interface TranscriptContent {
  type: 'text' | 'toolCall';
  text?: string;
  id?: string;
  name?: string;
  toolCallUid?: string;
  input?: Record<string, unknown>;
}

export interface TranscriptMessage {
  role: string;
  content: TranscriptContent[];
}

export interface GatewayResponse {
  meta: {
    commandId: string;
    conversationId?: string;
    sessionUid?: string;
    runUid?: string;
    terminal: boolean;
    message: string;
  };
  body?: unknown;
  events: GatewayEvent[];
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class AiChatService {
  private readonly agentUri = '/agent';

  constructor(private http: HttpClient, private localStorageService: LocalStorageService) {}

  getSessions(pageIndex = 0, pageSize = 100): Observable<Message<Page<AgentSession>>> {
    return this.http.get<Message<Page<AgentSession>>>(`${this.agentUri}/sessions?pageIndex=${pageIndex}&pageSize=${pageSize}`);
  }

  getAlertAnalysisSessions(pageIndex = 0, pageSize = 100): Observable<Message<Page<AgentSession>>> {
    return this.http.get<Message<Page<AgentSession>>>(
      `${this.agentUri}/alert-analysis/sessions?pageIndex=${pageIndex}&pageSize=${pageSize}`
    );
  }

  getSession(sessionUid: string): Observable<Message<GatewayResponse>> {
    return this.http.get<Message<GatewayResponse>>(`${this.agentUri}/sessions/${encodeURIComponent(sessionUid)}`);
  }

  getAlertAnalysisSession(sessionUid: string): Observable<Message<GatewayResponse>> {
    return this.http.get<Message<GatewayResponse>>(`${this.agentUri}/alert-analysis/sessions/${encodeURIComponent(sessionUid)}`);
  }

  getSessionTranscript(sessionUid: string): Observable<Message<Page<AgentTranscriptEntry>>> {
    return this.http.get<Message<Page<AgentTranscriptEntry>>>(
      `${this.agentUri}/sessions/${encodeURIComponent(sessionUid)}/transcript?pageIndex=0&pageSize=200`
    );
  }

  getAlertAnalysisSessionTranscript(sessionUid: string): Observable<Message<Page<AgentTranscriptEntry>>> {
    return this.http.get<Message<Page<AgentTranscriptEntry>>>(
      `${this.agentUri}/alert-analysis/sessions/${encodeURIComponent(sessionUid)}/transcript?pageIndex=0&pageSize=200`
    );
  }

  stopRun(runUid: string): Observable<Message<GatewayResponse>> {
    return this.http.post<Message<GatewayResponse>>(`${this.agentUri}/runs/${encodeURIComponent(runUid)}/stop`, {});
  }

  approve(approvalId: string): Observable<Message<GatewayResponse>> {
    return this.http.post<Message<GatewayResponse>>(`${this.agentUri}/approvals/${encodeURIComponent(approvalId)}/approve`, {});
  }

  reject(approvalId: string): Observable<Message<GatewayResponse>> {
    return this.http.post<Message<GatewayResponse>>(`${this.agentUri}/approvals/${encodeURIComponent(approvalId)}/reject`, {});
  }

  submitInteraction(interactionId: string, values: Record<string, unknown>): Observable<Message<string>> {
    return this.http.post<Message<string>>(`${this.agentUri}/interactions/${encodeURIComponent(interactionId)}/submit`, { values });
  }

  streamChat(message: string, conversationId: string, messageId: string): Observable<GatewayEvent> {
    return new Observable<GatewayEvent>(subscriber => {
      const abortController = new AbortController();
      const token = this.localStorageService.getAuthorizationToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      fetch('/api/agent/webui/chat/stream', {
        method: 'POST',
        headers,
        signal: abortController.signal,
        body: JSON.stringify({ conversationId, messageId, message })
      })
        .then(async response => {
          if (!response.ok) {
            throw new Error(`Agent Gateway returned HTTP ${response.status}`);
          }
          if (!response.body) {
            throw new Error('Agent Gateway returned an empty stream');
          }
          await this.readEventStream(response.body.getReader(), subscriber);
          subscriber.complete();
        })
        .catch(error => {
          if (!abortController.signal.aborted) {
            subscriber.error(error);
          }
        });

      return () => abortController.abort();
    });
  }

  private async readEventStream(reader: ReadableStreamDefaultReader<Uint8Array>, subscriber: Subscriber<GatewayEvent>): Promise<void> {
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() || '';
      for (const frame of frames) {
        const data = this.eventData(frame);
        if (data) {
          subscriber.next(JSON.parse(data) as GatewayEvent);
        }
      }
      if (done) {
        if (buffer.trim()) {
          const data = this.eventData(buffer);
          if (data) {
            subscriber.next(JSON.parse(data) as GatewayEvent);
          }
        }
        return;
      }
    }
  }

  private eventData(frame: string): string {
    return frame
      .split(/\r?\n/)
      .filter(line => line.startsWith('data:'))
      .map(line => line.substring(5).trimStart())
      .join('\n');
  }
}
