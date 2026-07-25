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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AgentSession } from '../../service/ai-chat.service';
import { AiSessionStore, AiSessionType } from '../../shared/services/ai-session.store';

@Component({
  selector: 'app-ai-session-navigation',
  templateUrl: './ai-session-navigation.component.html',
  styleUrls: ['./ai-session-navigation.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiSessionNavigationComponent implements OnInit, OnDestroy {
  chatSessions: AgentSession[] = [];
  alertAnalysisSessions: AgentSession[] = [];
  chatSessionsCollapsed = false;
  alertAnalysisSessionsCollapsed = false;
  loadingChatSessions = false;
  loadingAlertAnalysisSessions = false;
  loadingMoreChatSessions = false;
  loadingMoreAlertAnalysisSessions = false;
  chatSessionsHasMore = false;
  alertAnalysisSessionsHasMore = false;

  private readonly subscriptions = new Subscription();

  constructor(private sessionStore: AiSessionStore, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.sessionStore.chatSessions$.subscribe(sessions => {
        this.chatSessions = sessions;
        this.cdr.markForCheck();
      })
    );
    this.subscriptions.add(
      this.sessionStore.alertAnalysisSessions$.subscribe(sessions => {
        this.alertAnalysisSessions = sessions;
        this.cdr.markForCheck();
      })
    );
    this.subscriptions.add(
      this.sessionStore.chatHasMore$.subscribe(hasMore => {
        this.chatSessionsHasMore = hasMore;
        this.cdr.markForCheck();
      })
    );
    this.subscriptions.add(
      this.sessionStore.alertAnalysisHasMore$.subscribe(hasMore => {
        this.alertAnalysisSessionsHasMore = hasMore;
        this.cdr.markForCheck();
      })
    );
    this.loadSessions('chat');
    this.loadSessions('alert-analysis');
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  trackSession(_: number, session: AgentSession): string {
    return session.sessionUid;
  }

  createNewConversation(): void {
    this.sessionStore.startNewConversation();
    this.router.navigate(['/ai/chat/new'], { queryParams: { request: Date.now() } });
  }

  loadMoreSessions(sessionType: AiSessionType): void {
    if (sessionType === 'chat') {
      this.loadingMoreChatSessions = true;
    } else {
      this.loadingMoreAlertAnalysisSessions = true;
    }
    this.subscriptions.add(
      this.sessionStore.loadMore(sessionType).subscribe({
        next: () => this.finishLoadingMore(sessionType),
        error: () => this.finishLoadingMore(sessionType)
      })
    );
  }

  private loadSessions(sessionType: AiSessionType): void {
    if (sessionType === 'chat') {
      this.loadingChatSessions = true;
    } else {
      this.loadingAlertAnalysisSessions = true;
    }
    this.subscriptions.add(
      this.sessionStore.refresh(sessionType).subscribe({
        next: () => this.finishLoading(sessionType),
        error: () => this.finishLoading(sessionType)
      })
    );
  }

  private finishLoading(sessionType: AiSessionType): void {
    if (sessionType === 'chat') {
      this.loadingChatSessions = false;
    } else {
      this.loadingAlertAnalysisSessions = false;
    }
    this.cdr.markForCheck();
  }

  private finishLoadingMore(sessionType: AiSessionType): void {
    if (sessionType === 'chat') {
      this.loadingMoreChatSessions = false;
    } else {
      this.loadingMoreAlertAnalysisSessions = false;
    }
    this.cdr.markForCheck();
  }
}
