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

import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzTableQueryParams } from 'ng-zorro-antd/table';
import { forkJoin } from 'rxjs';

import { NoticeReceiver } from '../../../pojo/NoticeReceiver';
import { NoticeTemplate } from '../../../pojo/NoticeTemplate';
import { AgentSchedule, AgentScheduleRequest, AgentScheduleService } from '../../../service/agent-schedule.service';
import { TranscriptMessage } from '../../../service/ai-chat.service';
import { NoticeReceiverService } from '../../../service/notice-receiver.service';
import { NoticeTemplateService } from '../../../service/notice-template.service';

interface ScheduleTranscriptMessage {
  sequence: number;
  role: string;
  content: string;
  createdAt: string;
}

@Component({
  selector: 'app-agent-schedule',
  templateUrl: './agent-schedule.component.html',
  styleUrls: ['./agent-schedule.component.less']
})
export class AgentScheduleComponent implements OnInit {
  @ViewChild('scheduleForm', { static: false }) scheduleForm?: NgForm;
  @ViewChild('transcriptContainer') transcriptContainer?: ElementRef<HTMLElement>;

  schedules: AgentSchedule[] = [];
  loading = false;
  pageIndex = 1;
  pageSize = 10;
  total = 0;

  receivers: NoticeReceiver[] = [];
  templates: NoticeTemplate[] = [];

  modalVisible = false;
  modalLoading = false;
  editingSchedule?: AgentSchedule;
  request = this.newRequest();

  transcriptVisible = false;
  transcriptLoading = false;
  transcriptLoadingEarlier = false;
  transcriptHasEarlier = false;
  transcriptPageIndex = 0;
  selectedSchedule?: AgentSchedule;
  transcript: ScheduleTranscriptMessage[] = [];
  runningScheduleIds = new Set<number>();

  constructor(
    private scheduleService: AgentScheduleService,
    private receiverService: NoticeReceiverService,
    private templateService: NoticeTemplateService,
    private modal: NzModalService,
    private notifySvc: NzNotificationService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  ngOnInit(): void {
    this.loadOptions();
    this.loadSchedules();
  }

  get availableTemplates(): NoticeTemplate[] {
    const selectedTypes = new Set(
      this.receivers.filter(receiver => this.request.receiverIds.includes(receiver.id)).map(receiver => receiver.type)
    );
    return selectedTypes.size === 1 ? this.templates.filter(template => selectedTypes.has(template.type)) : [];
  }

  loadSchedules(): void {
    this.loading = true;
    this.scheduleService.list(this.pageIndex - 1, this.pageSize).subscribe({
      next: message => {
        this.loading = false;
        if (message.code === 0) {
          this.schedules = message.data.content;
          this.pageIndex = message.data.number + 1;
          this.total = message.data.totalElements;
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('agent.schedule.load-fail'), message.msg);
        }
      },
      error: error => {
        this.loading = false;
        this.notifySvc.error(this.i18nSvc.fanyi('agent.schedule.load-fail'), error.message);
      }
    });
  }

  onTableChange(params: NzTableQueryParams): void {
    this.pageIndex = params.pageIndex;
    this.pageSize = params.pageSize;
    this.loadSchedules();
  }

  openCreate(): void {
    this.editingSchedule = undefined;
    this.request = this.newRequest();
    this.modalVisible = true;
  }

  openEdit(schedule: AgentSchedule): void {
    this.editingSchedule = schedule;
    this.request = {
      name: schedule.name,
      instruction: schedule.instruction,
      cronExpression: schedule.cronExpression,
      enabled: schedule.enabled,
      receiverIds: [...schedule.receiverIds],
      templateId: schedule.templateId
    };
    this.modalVisible = true;
  }

  receiverSelectionChanged(): void {
    if (this.request.templateId && !this.availableTemplates.some(template => template.id === this.request.templateId)) {
      this.request.templateId = undefined;
    }
  }

  save(): void {
    if (this.scheduleForm?.invalid) {
      Object.values(this.scheduleForm.controls).forEach(control => {
        control.markAsDirty();
        control.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }
    this.modalLoading = true;
    const operation = this.editingSchedule
      ? this.scheduleService.update(this.editingSchedule.id, this.request)
      : this.scheduleService.create(this.request);
    operation.subscribe({
      next: message => {
        this.modalLoading = false;
        if (message.code === 0) {
          this.modalVisible = false;
          this.notifySvc.success(this.i18nSvc.fanyi(this.editingSchedule ? 'common.notify.edit-success' : 'common.notify.new-success'), '');
          this.loadSchedules();
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('agent.schedule.save-fail'), message.msg);
        }
      },
      error: error => {
        this.modalLoading = false;
        this.notifySvc.error(this.i18nSvc.fanyi('agent.schedule.save-fail'), error.message);
      }
    });
  }

  toggle(schedule: AgentSchedule, enabled: boolean): void {
    this.scheduleService.toggle(schedule.id, enabled).subscribe({
      next: message => {
        if (message.code === 0) {
          schedule.enabled = message.data.enabled;
          schedule.nextTriggerAt = message.data.nextTriggerAt;
        } else {
          schedule.enabled = !enabled;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), message.msg);
        }
      },
      error: error => {
        schedule.enabled = !enabled;
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.message);
      }
    });
  }

  runNow(schedule: AgentSchedule): void {
    this.runningScheduleIds.add(schedule.id);
    this.scheduleService.runNow(schedule.id).subscribe({
      next: message => {
        this.runningScheduleIds.delete(schedule.id);
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('agent.schedule.run-accepted'), message.data.runUid);
          this.loadSchedules();
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('agent.schedule.run-fail'), message.msg);
        }
      },
      error: error => {
        this.runningScheduleIds.delete(schedule.id);
        this.notifySvc.error(this.i18nSvc.fanyi('agent.schedule.run-fail'), error.message);
      }
    });
  }

  confirmDelete(schedule: AgentSchedule): void {
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('agent.schedule.delete-confirm', { name: schedule.name }),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOnOk: () => this.delete(schedule.id)
    });
  }

  viewTranscript(schedule: AgentSchedule): void {
    this.selectedSchedule = schedule;
    this.transcript = [];
    this.transcriptHasEarlier = false;
    this.transcriptPageIndex = 0;
    this.transcriptVisible = true;
    this.loadTranscriptPage(schedule, 0);
  }

  loadEarlierTranscript(): void {
    if (!this.selectedSchedule || !this.transcriptHasEarlier || this.transcriptLoadingEarlier) {
      return;
    }
    this.loadTranscriptPage(this.selectedSchedule, this.transcriptPageIndex + 1);
  }

  trackTranscript(_index: number, message: ScheduleTranscriptMessage): number {
    return message.sequence;
  }

  receiverNames(schedule: AgentSchedule): string {
    return schedule.receiverIds.map(id => this.receivers.find(receiver => receiver.id === id)?.name || String(id)).join(', ');
  }

  templateName(templateId?: number): string {
    return templateId
      ? this.templates.find(template => template.id === templateId)?.name || String(templateId)
      : this.i18nSvc.fanyi('agent.schedule.default-template');
  }

  private loadTranscriptPage(schedule: AgentSchedule, pageIndex: number): void {
    const initialPage = pageIndex === 0;
    this.transcriptLoading = initialPage;
    this.transcriptLoadingEarlier = !initialPage;
    this.scheduleService.transcript(schedule.id, pageIndex, 20).subscribe({
      next: message => {
        if (this.selectedSchedule?.id !== schedule.id) {
          return;
        }
        this.transcriptLoading = false;
        this.transcriptLoadingEarlier = false;
        if (message.code !== 0) {
          this.notifySvc.error(this.i18nSvc.fanyi('agent.schedule.transcript-load-fail'), message.msg);
          return;
        }
        const container = this.transcriptContainer?.nativeElement;
        const previousScrollHeight = container?.scrollHeight || 0;
        const previousScrollTop = container?.scrollTop || 0;
        const pageMessages = message.data.content
          .flatMap(entry => {
            try {
              const payload = JSON.parse(entry.payloadJson) as TranscriptMessage;
              if (payload.role !== 'user' && payload.role !== 'assistant') {
                return [];
              }
              const content = (payload.content || [])
                .filter(item => item.type === 'text' && item.text)
                .map(item => item.text)
                .join('\n');
              return content ? [{ sequence: entry.sessionSequence, role: payload.role, content, createdAt: entry.gmtCreate }] : [];
            } catch {
              return [];
            }
          })
          .reverse();
        this.transcript = initialPage ? pageMessages : [...pageMessages, ...this.transcript];
        this.transcriptPageIndex = message.data.number;
        this.transcriptHasEarlier = message.data.number + 1 < message.data.totalPages;
        this.scheduleTranscriptScroll(initialPage, previousScrollHeight, previousScrollTop);
      },
      error: error => {
        if (this.selectedSchedule?.id !== schedule.id) {
          return;
        }
        this.transcriptLoading = false;
        this.transcriptLoadingEarlier = false;
        this.notifySvc.error(this.i18nSvc.fanyi('agent.schedule.transcript-load-fail'), error.message);
      }
    });
  }

  private scheduleTranscriptScroll(scrollToLatest: boolean, previousScrollHeight: number, previousScrollTop: number): void {
    const updateScroll = (): void => {
      const container = this.transcriptContainer?.nativeElement;
      if (!container) {
        return;
      }
      container.scrollTop = scrollToLatest ? container.scrollHeight : container.scrollHeight - previousScrollHeight + previousScrollTop;
    };
    requestAnimationFrame(() => requestAnimationFrame(updateScroll));
  }

  private loadOptions(): void {
    forkJoin({
      receivers: this.receiverService.getAllReceivers(),
      templates: this.templateService.getAllNoticeTemplates()
    }).subscribe({
      next: result => {
        if (result.receivers.code === 0) {
          this.receivers = result.receivers.data;
        }
        if (result.templates.code === 0) {
          this.templates = result.templates.data;
        }
      },
      error: error => this.notifySvc.error(this.i18nSvc.fanyi('agent.schedule.options-load-fail'), error.message)
    });
  }

  private delete(scheduleId: number): void {
    this.loading = true;
    this.scheduleService.delete(scheduleId).subscribe({
      next: message => {
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
          this.loadSchedules();
        } else {
          this.loading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), message.msg);
        }
      },
      error: error => {
        this.loading = false;
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), error.message);
      }
    });
  }

  private newRequest(): AgentScheduleRequest {
    return {
      name: '',
      instruction: '',
      cronExpression: '0 0 9 * * *',
      enabled: true,
      receiverIds: []
    };
  }
}
