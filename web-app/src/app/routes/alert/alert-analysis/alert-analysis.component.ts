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

import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzTableQueryParams } from 'ng-zorro-antd/table';

import { AgentSession, TranscriptMessage } from '../../../service/ai-chat.service';
import { AlertAnalysisPolicy, AlertAnalysisPolicyRequest, AlertAnalysisService } from '../../../service/alert-analysis.service';

interface MatchLabelEntry {
  key: string;
  value: string;
}

interface AnalysisMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

@Component({
  selector: 'app-alert-analysis',
  templateUrl: './alert-analysis.component.html',
  styleUrls: ['./alert-analysis.component.less']
})
export class AlertAnalysisComponent implements OnInit {
  @ViewChild('policyForm', { static: false }) policyForm?: NgForm;

  readonly commonLabels = ['alertname', 'instance', 'job', 'severity', 'service', 'host', 'env'];

  sessions: AgentSession[] = [];
  sessionsLoading = false;
  sessionSearch = '';
  sessionPageIndex = 1;
  sessionPageSize = 8;
  sessionTotal = 0;

  policies: AlertAnalysisPolicy[] = [];
  policiesLoading = false;
  policySearch = '';
  agentClientConfigured = false;
  availabilityLoading = true;

  detailVisible = false;
  detailLoading = false;
  selectedSession?: AgentSession;
  analysisMessages: AnalysisMessage[] = [];

  policyModalVisible = false;
  policyModalLoading = false;
  policyRequest = this.newPolicyRequest();
  matchLabelEntries: MatchLabelEntry[] = [];

  constructor(
    private alertAnalysisService: AlertAnalysisService,
    private modal: NzModalService,
    private notifySvc: NzNotificationService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  ngOnInit(): void {
    this.loadSessions();
    this.loadAvailability();
    this.loadPolicies();
  }

  get filteredPolicies(): AlertAnalysisPolicy[] {
    const search = this.policySearch.toLocaleLowerCase();
    return search ? this.policies.filter(policy => policy.name.toLocaleLowerCase().includes(search)) : this.policies;
  }

  loadSessions(): void {
    this.sessionsLoading = true;
    this.alertAnalysisService.getSessions(this.sessionSearch, this.sessionPageIndex - 1, this.sessionPageSize).subscribe({
      next: message => {
        this.sessionsLoading = false;
        if (message.code === 0) {
          this.sessions = message.data.content;
          this.sessionPageIndex = message.data.number + 1;
          this.sessionTotal = message.data.totalElements;
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('alert.analysis.record.load-fail'), message.msg);
        }
      },
      error: error => {
        this.sessionsLoading = false;
        this.notifySvc.error(this.i18nSvc.fanyi('alert.analysis.record.load-fail'), error.message);
      }
    });
  }

  searchSessions(): void {
    this.sessionPageIndex = 1;
    this.loadSessions();
  }

  onSessionTableChange(params: NzTableQueryParams): void {
    this.sessionPageIndex = params.pageIndex;
    this.sessionPageSize = params.pageSize;
    this.loadSessions();
  }

  viewAnalysis(session: AgentSession): void {
    this.selectedSession = session;
    this.analysisMessages = [];
    this.detailVisible = true;
    this.detailLoading = true;
    this.alertAnalysisService.getSessionTranscript(session.sessionUid).subscribe({
      next: message => {
        this.detailLoading = false;
        if (message.code === 0) {
          this.analysisMessages = message.data.content.flatMap(entry => {
            try {
              const payload = JSON.parse(entry.payloadJson) as TranscriptMessage;
              if (payload.role !== 'user' && payload.role !== 'assistant') {
                return [];
              }
              const content = (payload.content || [])
                .filter(item => item.type === 'text' && item.text)
                .map(item => item.text)
                .join('\n');
              return content ? [{ role: payload.role, content, createdAt: entry.gmtCreate }] : [];
            } catch {
              return [];
            }
          });
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('alert.analysis.detail.load-fail'), message.msg);
        }
      },
      error: error => {
        this.detailLoading = false;
        this.notifySvc.error(this.i18nSvc.fanyi('alert.analysis.detail.load-fail'), error.message);
      }
    });
  }

  loadPolicies(): void {
    this.policiesLoading = true;
    this.alertAnalysisService.getPolicies().subscribe({
      next: message => {
        this.policiesLoading = false;
        if (message.code === 0) {
          this.policies = message.data;
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('alert.analysis.policy.load-fail'), message.msg);
        }
      },
      error: error => {
        this.policiesLoading = false;
        this.notifySvc.error(this.i18nSvc.fanyi('alert.analysis.policy.load-fail'), error.message);
      }
    });
  }

  loadAvailability(): void {
    this.availabilityLoading = true;
    this.alertAnalysisService.isAgentClientConfigured().subscribe({
      next: message => {
        this.availabilityLoading = false;
        this.agentClientConfigured = message.code === 0 && message.data;
      },
      error: () => {
        this.availabilityLoading = false;
        this.agentClientConfigured = false;
      }
    });
  }

  openPolicyModal(): void {
    if (!this.agentClientConfigured) {
      return;
    }
    this.policyRequest = this.newPolicyRequest();
    this.matchLabelEntries = [];
    this.policyModalVisible = true;
  }

  addMatchLabel(): void {
    this.matchLabelEntries.push({ key: '', value: '' });
  }

  removeMatchLabel(index: number): void {
    this.matchLabelEntries.splice(index, 1);
  }

  createPolicy(): void {
    if (this.policyForm?.invalid) {
      Object.values(this.policyForm.controls).forEach(control => {
        control.markAsDirty();
        control.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }
    this.policyRequest.matchLabels = Object.fromEntries(this.matchLabelEntries.map(entry => [entry.key, entry.value]));
    this.policyModalLoading = true;
    this.alertAnalysisService.createPolicy(this.policyRequest).subscribe({
      next: message => {
        this.policyModalLoading = false;
        if (message.code === 0) {
          this.policyModalVisible = false;
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.new-success'), '');
          this.loadPolicies();
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), message.msg);
        }
      },
      error: error => {
        this.policyModalLoading = false;
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), error.message);
      }
    });
  }

  togglePolicy(policy: AlertAnalysisPolicy, enabled: boolean): void {
    if (enabled && !this.agentClientConfigured) {
      policy.enabled = false;
      return;
    }
    this.alertAnalysisService.togglePolicy(policy.id, enabled).subscribe({
      next: message => {
        if (message.code === 0) {
          policy.enabled = message.data.enabled;
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.edit-success'), '');
        } else {
          policy.enabled = !enabled;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), message.msg);
        }
      },
      error: error => {
        policy.enabled = !enabled;
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.message);
      }
    });
  }

  confirmDeletePolicy(policy: AlertAnalysisPolicy): void {
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('alert.analysis.policy.delete-confirm', { name: policy.name }),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOnOk: () => this.deletePolicy(policy.id)
    });
  }

  private deletePolicy(policyId: number): void {
    this.policiesLoading = true;
    this.alertAnalysisService.deletePolicy(policyId).subscribe({
      next: message => {
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
          this.loadPolicies();
        } else {
          this.policiesLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), message.msg);
        }
      },
      error: error => {
        this.policiesLoading = false;
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), error.message);
      }
    });
  }

  private newPolicyRequest(): AlertAnalysisPolicyRequest {
    return {
      name: '',
      matchLabels: {},
      groupByLabels: [],
      windowSeconds: 300,
      minimumAlertCount: 2,
      cooldownSeconds: 1800
    };
  }
}
