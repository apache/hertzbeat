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

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { AgentSession, AiChatService } from '../../service/ai-chat.service';

export type AiSessionType = 'chat' | 'alert-analysis';

@Injectable({
  providedIn: 'root'
})
export class AiSessionStore {
  private readonly pageSize = 8;
  private readonly chatSessionsSubject = new BehaviorSubject<AgentSession[]>([]);
  private readonly alertAnalysisSessionsSubject = new BehaviorSubject<AgentSession[]>([]);
  private readonly chatHasMoreSubject = new BehaviorSubject(false);
  private readonly alertAnalysisHasMoreSubject = new BehaviorSubject(false);
  private readonly nextPage: Record<AiSessionType, number> = { chat: 0, 'alert-analysis': 0 };
  private pendingInitialMessage = '';

  readonly chatSessions$ = this.chatSessionsSubject.asObservable();
  readonly alertAnalysisSessions$ = this.alertAnalysisSessionsSubject.asObservable();
  readonly chatHasMore$ = this.chatHasMoreSubject.asObservable();
  readonly alertAnalysisHasMore$ = this.alertAnalysisHasMoreSubject.asObservable();

  constructor(private aiChatService: AiChatService) {}

  startNewConversation(initialMessage = ''): void {
    this.pendingInitialMessage = initialMessage;
  }

  takeInitialMessage(): string {
    const initialMessage = this.pendingInitialMessage;
    this.pendingInitialMessage = '';
    return initialMessage;
  }

  clearInitialMessage(): void {
    this.pendingInitialMessage = '';
  }

  refresh(sessionType: AiSessionType): Observable<AgentSession[]> {
    return this.loadPage(sessionType, 0, false);
  }

  loadMore(sessionType: AiSessionType): Observable<AgentSession[]> {
    return this.loadPage(sessionType, this.nextPage[sessionType], true);
  }

  private loadPage(sessionType: AiSessionType, pageIndex: number, append: boolean): Observable<AgentSession[]> {
    const request =
      sessionType === 'alert-analysis'
        ? this.aiChatService.getAlertAnalysisSessions(pageIndex, this.pageSize)
        : this.aiChatService.getSessions(pageIndex, this.pageSize);
    return request.pipe(
      map(response => {
        const page = response.data;
        const pageSessions = page?.content || [];
        const sessions = append
          ? Array.from(
              new Map([...this.subject(sessionType).value, ...pageSessions].map(session => [session.sessionUid, session])).values()
            )
          : pageSessions;
        return { sessions, hasMore: page ? pageIndex + 1 < page.totalPages : false };
      }),
      tap(({ sessions, hasMore }) => {
        this.subject(sessionType).next(sessions);
        this.hasMoreSubject(sessionType).next(hasMore);
        this.nextPage[sessionType] = pageIndex + 1;
      }),
      map(({ sessions }) => sessions)
    );
  }

  private subject(sessionType: AiSessionType): BehaviorSubject<AgentSession[]> {
    return sessionType === 'alert-analysis' ? this.alertAnalysisSessionsSubject : this.chatSessionsSubject;
  }

  private hasMoreSubject(sessionType: AiSessionType): BehaviorSubject<boolean> {
    return sessionType === 'alert-analysis' ? this.alertAnalysisHasMoreSubject : this.chatHasMoreSubject;
  }
}
