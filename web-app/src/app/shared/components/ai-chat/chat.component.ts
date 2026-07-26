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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { combineLatest, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

import {
  ModelProviderConfig,
  ModelProviderConfigState,
  ModelProviderConfigView,
  ProviderConfigField,
  ProviderOption
} from '../../../pojo/ModelProviderConfig';
import { AgentSession, AgentTranscriptEntry, AiChatService, GatewayEvent, TranscriptMessage } from '../../../service/ai-chat.service';
import { GeneralConfigService } from '../../../service/general-config.service';
import { ThemeService } from '../../../service/theme.service';
import { AiSessionStore, AiSessionType } from '../../services/ai-session.store';

type AssistantRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
type RunItemStatus = 'streaming' | 'running' | 'completed' | 'failed' | 'waiting_approval';
type ApprovalStatus = 'waiting' | 'resolving' | 'approved' | 'rejected';

interface UserMessage {
  content: string;
  createdAt: Date;
}

interface AssistantRunItem {
  type: 'text' | 'tool';
  itemId: string;
  status: RunItemStatus;
  content?: string;
  pendingContent?: string;
  toolName?: string;
  toolCallUid?: string;
  toolInput?: Record<string, unknown>;
  toolInputExpanded?: boolean;
  approval?: PendingApproval;
  interaction?: PendingInteraction;
}

interface AssistantRun {
  runUid?: string;
  status: AssistantRunStatus;
  items: AssistantRunItem[];
  createdAt: Date;
  error?: string;
}

interface ChatTurn {
  id: string;
  runId?: number;
  user: UserMessage;
  assistant: AssistantRun;
}

interface ChatSession {
  conversationId: string;
  sessionUid?: string;
  title: string;
  updatedAt: Date;
}

interface PendingApproval {
  approvalId: string;
  toolName: string;
  toolCallUid?: string;
  message: string;
  status: ApprovalStatus;
}

interface InteractionField {
  field: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
}

interface PendingInteraction {
  interactionId: string;
  targetTool: string;
  title: string;
  description: string;
  fields: InteractionField[];
  values: Record<string, unknown>;
  status: 'waiting' | 'submitting' | 'submitted' | 'completed' | 'failed';
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLElement>;

  sessionType: AiSessionType = 'chat';
  currentSession: ChatSession | null = null;
  turns: ChatTurn[] = [];
  newMessage = '';
  initialMessage = '';
  isLoadingSessions = false;
  isSendingMessage = false;
  isStopping = false;
  theme = 'default';
  activeRunUid?: string;
  pendingApproval?: PendingApproval;
  showScrollToBottom = false;
  providerMenuVisible = false;
  showConfigModal = false;
  configLoading = false;
  providerSwitching = false;
  providerOptionsLoading = true;
  aiProviderConfig = new ModelProviderConfig();
  providerOptions: ProviderOption[] = [];
  providerConfigs: ModelProviderConfigView[] = [];
  activeProviderUid: string | null = null;
  editingProvider?: ModelProviderConfigView;
  selectedProviderOption?: ProviderOption;

  private streamSubscription?: Subscription;
  private routeSubscription?: Subscription;
  private sessionLoadSubscription?: Subscription;
  private renderFrame?: number;
  private scrollFrame?: number;
  private followOutput = true;
  private readonly processedEventIds = new Set<string>();

  constructor(
    private aiChatService: AiChatService,
    private message: NzMessageService,
    private modal: NzModalService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService,
    private cdr: ChangeDetectorRef,
    private themeSvc: ThemeService,
    private route: ActivatedRoute,
    private sessionStore: AiSessionStore,
    private generalConfigSvc: GeneralConfigService
  ) {}

  ngOnInit(): void {
    this.theme = this.themeSvc.getTheme() || 'default';
    this.loadModelProviderConfig();
    this.routeSubscription = combineLatest([this.route.data, this.route.paramMap, this.route.queryParamMap]).subscribe(([data, params]) => {
      this.sessionType = (data['sessionType'] as AiSessionType | undefined) || 'chat';
      const sessionUid = params.get('sessionUid');
      if (sessionUid) {
        this.loadSession(sessionUid);
      } else if (this.sessionType === 'chat') {
        this.initialMessage = this.sessionStore.takeInitialMessage();
        this.createNewConversation();
      } else {
        this.currentSession = null;
        this.turns = [];
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.streamSubscription?.unsubscribe();
    this.sessionLoadSubscription?.unsubscribe();
    if (this.renderFrame !== undefined) {
      cancelAnimationFrame(this.renderFrame);
    }
    if (this.scrollFrame !== undefined) {
      cancelAnimationFrame(this.scrollFrame);
    }
  }

  createNewConversation(): void {
    if (this.isSendingMessage) {
      return;
    }
    this.sessionLoadSubscription?.unsubscribe();
    this.isLoadingSessions = false;
    this.currentSession = {
      conversationId: this.newId('webui'),
      title: this.i18nSvc.fanyi('ai.chat.new-chat'),
      updatedAt: new Date()
    };
    this.turns = [];
    this.pendingApproval = undefined;
    this.activeRunUid = undefined;
    this.followOutput = true;
    this.showScrollToBottom = false;
    this.cdr.markForCheck();
    if (this.initialMessage) {
      this.newMessage = this.initialMessage;
      this.initialMessage = '';
      setTimeout(() => this.sendMessage());
    }
  }

  canDeactivate(): boolean {
    return !this.isSendingMessage || window.confirm('The Agent is still running. Leave this page and stop the current stream?');
  }

  get activeModelLabel(): string {
    const activeProvider = this.providerConfigs.find(config => config.uid === this.activeProviderUid);
    if (!activeProvider) {
      return this.i18nSvc.fanyi('ai.chat.config.provider.default');
    }
    const provider = this.findProviderOption(activeProvider)?.label;
    if (provider && activeProvider.model) {
      return `${provider} / ${activeProvider.model}`;
    }
    return activeProvider.model || provider || activeProvider.code || activeProvider.type || this.i18nSvc.fanyi('ai.chat.config.model');
  }

  openCreateModelProvider(): void {
    this.providerMenuVisible = false;
    this.editingProvider = undefined;
    this.selectedProviderOption = undefined;
    this.aiProviderConfig = new ModelProviderConfig();
    this.showConfigModal = true;
  }

  openEditModelProvider(config: ModelProviderConfigView): void {
    this.providerMenuVisible = false;
    this.editingProvider = config;
    this.aiProviderConfig = {
      ...new ModelProviderConfig(),
      uid: config.uid,
      type: config.type,
      code: config.code,
      baseUrl: config.baseUrl,
      model: config.model
    };
    this.selectedProviderOption = this.findProviderOption(config);
    if (this.selectedProviderOption) {
      this.aiProviderConfig.type = this.selectedProviderOption.type;
      this.aiProviderConfig.baseUrl ||= this.selectedProviderOption.defaultBaseUrl || '';
      this.aiProviderConfig.model ||= this.selectedProviderOption.defaultModel || '';
    }
    this.showConfigModal = true;
  }

  closeModelConfig(): void {
    this.showConfigModal = false;
    this.editingProvider = undefined;
    this.selectedProviderOption = undefined;
    this.aiProviderConfig = new ModelProviderConfig();
  }

  saveModelProviderConfig(): void {
    if (!this.selectedProviderOption || !this.aiProviderConfig.type || !this.aiProviderConfig.code) {
      this.message.error(this.i18nSvc.fanyi('ai.chat.error.provider'));
      return;
    }
    if (this.isProviderFieldRequired('apiKey') && !this.aiProviderConfig.apiKey && !this.canPreserveSavedApiKey()) {
      this.message.error(this.i18nSvc.fanyi('ai.chat.error.api.key'));
      return;
    }
    if (this.isProviderFieldRequired('baseUrl') && !this.aiProviderConfig.baseUrl) {
      this.message.error(this.i18nSvc.fanyi('ai.chat.error.base.url'));
      return;
    }
    if (this.isProviderFieldRequired('model') && !this.aiProviderConfig.model) {
      this.message.error(this.i18nSvc.fanyi('ai.chat.error.model'));
      return;
    }

    this.configLoading = true;
    const saveRequest = this.editingProvider
      ? this.generalConfigSvc.updateModelProviderConfig(this.editingProvider.uid, this.aiProviderConfig)
      : this.generalConfigSvc.createModelProviderConfig(this.aiProviderConfig);
    saveRequest
      .pipe(
        finalize(() => {
          this.configLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: response => {
          if (response.code === 0 && response.data) {
            this.applyProviderState(response.data);
            this.showConfigModal = false;
            this.editingProvider = undefined;
            this.selectedProviderOption = undefined;
            this.aiProviderConfig = new ModelProviderConfig();
            this.message.success(this.i18nSvc.fanyi('ai.chat.config.save.success'));
          } else {
            this.message.error(`${this.i18nSvc.fanyi('ai.chat.config.save.failed')} ${response.msg}`);
          }
        },
        error: error => {
          const detail = error.error?.msg || error.message;
          this.message.error(`${this.i18nSvc.fanyi('ai.chat.config.save.failed')} ${detail}`);
        }
      });
  }

  switchModelProvider(uid: string | null): void {
    this.providerMenuVisible = false;
    if (this.activeProviderUid === uid) {
      return;
    }
    this.providerSwitching = true;
    this.generalConfigSvc
      .switchModelProvider(uid)
      .pipe(
        finalize(() => {
          this.providerSwitching = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: response => {
          if (response.code === 0 && response.data) {
            this.applyProviderState(response.data);
          } else {
            this.message.error(`${this.i18nSvc.fanyi('ai.chat.config.switch.failed')} ${response.msg}`);
          }
        },
        error: error => {
          const detail = error.error?.msg || error.message;
          this.message.error(`${this.i18nSvc.fanyi('ai.chat.config.switch.failed')} ${detail}`);
        }
      });
  }

  confirmDeleteModelProvider(config: ModelProviderConfigView): void {
    this.providerMenuVisible = false;
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('ai.chat.config.delete.title'),
      nzContent: this.providerConfigLabel(config),
      nzOkDanger: true,
      nzOnOk: () => this.deleteModelProvider(config.uid)
    });
  }

  providerConfigLabel(config: ModelProviderConfigView): string {
    const provider = this.findProviderOption(config)?.label || config.code || config.type;
    return config.model ? `${provider} / ${config.model}` : provider;
  }

  onProviderChange(provider?: ProviderOption): void {
    if (!provider) {
      return;
    }
    const providerChanged = this.aiProviderConfig.code !== provider.code || this.aiProviderConfig.type !== provider.type;
    if (!providerChanged) {
      return;
    }
    this.aiProviderConfig = {
      ...new ModelProviderConfig(),
      type: provider.type,
      code: provider.code,
      baseUrl: provider.defaultBaseUrl || '',
      model: provider.defaultModel || ''
    };
  }

  resetModelProviderDefaults(): void {
    if (!this.selectedProviderOption) {
      return;
    }
    this.aiProviderConfig = {
      ...this.aiProviderConfig,
      baseUrl: this.selectedProviderOption.defaultBaseUrl || '',
      model: this.selectedProviderOption.defaultModel || ''
    };
  }

  isProviderFieldRequired(field: ProviderConfigField): boolean {
    return this.selectedProviderOption?.requiredFields.includes(field) ?? false;
  }

  canPreserveSavedApiKey(): boolean {
    return (
      !!this.editingProvider?.apiKeyConfigured &&
      this.editingProvider.type === this.aiProviderConfig.type &&
      this.editingProvider.code === this.aiProviderConfig.code
    );
  }

  private loadSession(sessionUid: string): void {
    this.sessionLoadSubscription?.unsubscribe();
    const loadSubscription = new Subscription();
    this.sessionLoadSubscription = loadSubscription;
    this.currentSession = null;
    this.turns = [];
    this.pendingApproval = undefined;
    this.isLoadingSessions = true;
    this.followOutput = true;
    const sessionRequest =
      this.sessionType === 'alert-analysis'
        ? this.aiChatService.getAlertAnalysisSession(sessionUid)
        : this.aiChatService.getSession(sessionUid);
    loadSubscription.add(
      sessionRequest.subscribe({
        next: response => {
          const persisted = response.data?.body as AgentSession | undefined;
          if (persisted) {
            this.currentSession = this.toChatSession(persisted);
          }
          loadSubscription.add(this.loadTranscript(sessionUid));
        },
        error: () => {
          this.isLoadingSessions = false;
          this.message.error(this.i18nSvc.fanyi('ai.chat.error.conversations.load'));
          this.cdr.markForCheck();
        }
      })
    );
  }

  private loadModelProviderConfig(): void {
    combineLatest([this.generalConfigSvc.getModelProviderOptions(), this.generalConfigSvc.getModelProviderConfigs()])
      .pipe(
        finalize(() => {
          this.providerOptionsLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: ([optionsResponse, configResponse]) => {
          this.providerOptions = optionsResponse.code === 0 ? optionsResponse.data || [] : [];
          if (configResponse.code === 0 && configResponse.data) {
            this.applyProviderState(configResponse.data);
          }
          this.cdr.markForCheck();
        },
        error: () => this.cdr.markForCheck()
      });
  }

  private applyProviderState(state: ModelProviderConfigState): void {
    this.activeProviderUid = state.activeProviderUid;
    this.providerConfigs = state.providers || [];
  }

  private deleteModelProvider(uid: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.generalConfigSvc.deleteModelProviderConfig(uid).subscribe({
        next: response => {
          if (response.code === 0 && response.data) {
            this.applyProviderState(response.data);
            this.message.success(this.i18nSvc.fanyi('ai.chat.config.delete.success'));
            this.cdr.markForCheck();
            resolve();
          } else {
            this.message.error(`${this.i18nSvc.fanyi('ai.chat.config.delete.failed')} ${response.msg}`);
            reject();
          }
        },
        error: error => {
          const detail = error.error?.msg || error.message;
          this.message.error(`${this.i18nSvc.fanyi('ai.chat.config.delete.failed')} ${detail}`);
          reject(error);
        }
      });
    });
  }

  private findProviderOption(config: Pick<ModelProviderConfig, 'type' | 'code'>): ProviderOption | undefined {
    return this.providerOptions.find(option => option.type === config.type && option.code === config.code);
  }

  sendMessage(): void {
    const content = this.newMessage.trim();
    if (!content || this.isSendingMessage || !this.currentSession) {
      return;
    }

    const now = new Date();
    this.turns = [
      ...this.turns,
      {
        id: this.newId('turn'),
        user: { content, createdAt: now },
        assistant: { status: 'pending', items: [], createdAt: now }
      }
    ];
    this.newMessage = '';
    this.isSendingMessage = true;
    this.isStopping = false;
    this.pendingApproval = undefined;
    this.activeRunUid = undefined;
    this.processedEventIds.clear();
    this.followOutput = true;
    this.showScrollToBottom = false;
    this.cdr.detectChanges();
    this.scheduleScroll(true);

    this.streamSubscription = this.aiChatService.streamChat(content, this.currentSession.conversationId, this.newId('message')).subscribe({
      next: event => this.handleGatewayEvent(event),
      error: error => {
        const run = this.activeAssistantRun();
        if (run) {
          run.status = 'failed';
          run.error = this.i18nSvc.fanyi('ai.chat.error.processing');
        }
        this.finishRun();
        this.message.error(error.message || this.i18nSvc.fanyi('ai.chat.error.chat.response'));
      },
      complete: () => this.finishRun()
    });
  }

  stopRun(): void {
    if (!this.activeRunUid || this.isStopping) {
      return;
    }
    this.isStopping = true;
    this.cdr.markForCheck();
    this.aiChatService.stopRun(this.activeRunUid).subscribe({
      next: response => {
        if (response.data?.events?.some(event => event.type === 'ERROR')) {
          this.isStopping = false;
          this.message.error(response.data.events[0].payload.errorMessage || 'Unable to stop the Agent run');
          this.cdr.markForCheck();
        }
      },
      error: () => {
        this.isStopping = false;
        this.message.error('Unable to stop the Agent run');
        this.cdr.markForCheck();
      }
    });
  }

  resolveApproval(approved: boolean): void {
    const approval = this.pendingApproval;
    if (!approval || approval.status === 'resolving' || approval.status === 'approved' || approval.status === 'rejected') {
      return;
    }
    if (approved && !this.canApprove(approval)) {
      return;
    }
    approval.status = 'resolving';
    this.cdr.markForCheck();
    const request = approved ? this.aiChatService.approve(approval.approvalId) : this.aiChatService.reject(approval.approvalId);
    request.subscribe({
      next: response => {
        if (response.data?.events?.some(event => event.type === 'ERROR')) {
          approval.status = 'waiting';
          this.message.error(response.data.events[0].payload.errorMessage || 'Unable to resolve approval');
          this.cdr.markForCheck();
        }
      },
      error: () => {
        approval.status = 'waiting';
        this.message.error('Unable to resolve approval');
        this.cdr.markForCheck();
      }
    });
  }

  submitInteraction(interaction: PendingInteraction): void {
    if (interaction.status !== 'waiting' || !this.canSubmitInteraction(interaction)) {
      return;
    }
    interaction.status = 'submitting';
    this.cdr.markForCheck();
    this.aiChatService.submitInteraction(interaction.interactionId, interaction.values).subscribe({
      next: () => {
        interaction.status = 'submitted';
        interaction.values = {};
        this.cdr.markForCheck();
      },
      error: () => {
        interaction.status = 'waiting';
        this.message.error(this.i18nSvc.fanyi('ai.chat.input-request.submit-failed'));
        this.cdr.markForCheck();
      }
    });
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onMessagesScroll(): void {
    const element = this.messagesContainer?.nativeElement;
    if (!element) {
      return;
    }
    this.followOutput = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
    this.showScrollToBottom = !this.followOutput;
    this.cdr.markForCheck();
  }

  scrollToLatest(): void {
    const element = this.messagesContainer?.nativeElement;
    if (!element) {
      return;
    }
    this.followOutput = true;
    this.showScrollToBottom = false;
    element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
    this.cdr.markForCheck();
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  canApprove(approval: PendingApproval): boolean {
    return approval.status === 'waiting';
  }

  canSubmitInteraction(interaction: PendingInteraction): boolean {
    return interaction.fields.every(field => {
      if (!field.required) {
        return true;
      }
      const value = interaction.values[field.field];
      return typeof value === 'string' ? Boolean(value.trim()) : value !== null && value !== undefined;
    });
  }

  trackTurn(_: number, turn: ChatTurn): string {
    return turn.id;
  }

  trackRunItem(_: number, item: AssistantRunItem): string {
    return item.itemId;
  }

  toggleToolInput(item: AssistantRunItem): void {
    item.toolInputExpanded = !item.toolInputExpanded;
  }

  formatToolInput(input: Record<string, unknown>): string {
    return JSON.stringify(input, null, 2);
  }

  private loadTranscript(sessionUid: string): Subscription {
    const transcriptRequest =
      this.sessionType === 'alert-analysis'
        ? this.aiChatService.getAlertAnalysisSessionTranscript(sessionUid)
        : this.aiChatService.getSessionTranscript(sessionUid);
    return transcriptRequest.subscribe({
      next: response => {
        this.isLoadingSessions = false;
        this.turns = this.toChatTurns(response.data?.content || []);
        this.cdr.detectChanges();
        this.scheduleScroll(true);
      },
      error: () => {
        this.isLoadingSessions = false;
        this.message.error(this.i18nSvc.fanyi('ai.chat.error.conversations.load'));
        this.cdr.markForCheck();
      }
    });
  }

  private handleGatewayEvent(event: GatewayEvent): void {
    if (this.processedEventIds.has(event.eventId)) {
      return;
    }
    this.processedEventIds.add(event.eventId);
    const run = this.activeAssistantRun();
    if (!run) {
      return;
    }
    if (event.runUid) {
      this.activeRunUid = event.runUid;
      run.runUid = event.runUid;
    }
    if (event.sessionUid && this.currentSession) {
      this.currentSession.sessionUid = event.sessionUid;
    }

    switch (event.type) {
      case 'RUN_STARTED':
        run.status = 'running';
        break;
      case 'MESSAGE_STARTED':
        this.ensureTextItem(run, event.itemId).status = 'streaming';
        break;
      case 'MESSAGE_DELTA': {
        const item = this.ensureTextItem(run, event.itemId);
        item.status = 'streaming';
        item.pendingContent = `${item.pendingContent || ''}${event.payload.delta || ''}`;
        this.scheduleRender();
        return;
      }
      case 'MESSAGE_COMPLETED':
        this.flushTextItem(this.ensureTextItem(run, event.itemId), true);
        break;
      case 'TOOL_STARTED': {
        const tool = this.ensureToolItem(run, event);
        tool.status = 'running';
        break;
      }
      case 'TOOL_COMPLETED': {
        const tool = this.ensureToolItem(run, event);
        tool.status = this.payloadString(event, 'status') === 'failed' || event.payload.errorMessage ? 'failed' : 'completed';
        break;
      }
      case 'INPUT_REQUESTED':
        this.handleInputRequested(run, event);
        break;
      case 'INPUT_COMPLETED':
        this.handleInputCompleted(run, event);
        break;
      case 'APPROVAL_REQUESTED':
        this.handleApprovalRequested(run, event);
        break;
      case 'APPROVAL_COMPLETED':
        this.handleApprovalCompleted(run, event);
        break;
      case 'RUN_COMPLETED':
        run.status = 'completed';
        this.finishRun();
        return;
      case 'ERROR':
        run.status = this.isStopping ? 'cancelled' : 'failed';
        run.error = event.payload.errorMessage || this.i18nSvc.fanyi('ai.chat.error.processing');
        this.finishRun();
        return;
    }
    this.cdr.detectChanges();
    this.scheduleScroll();
  }

  private handleApprovalRequested(run: AssistantRun, event: GatewayEvent): void {
    const tool = this.ensureToolItem(run, event);
    tool.status = 'waiting_approval';
    const approval: PendingApproval = {
      approvalId: event.payload.approvalId!,
      toolName: event.payload.toolName!,
      toolCallUid: this.payloadString(event, 'toolCallUid'),
      message: 'This tool changes HertzBeat data and requires approval.',
      status: 'waiting'
    };
    tool.approval = approval;
    this.pendingApproval = approval;
  }

  private handleInputRequested(run: AssistantRun, event: GatewayEvent): void {
    const item = run.items.find(candidate => candidate.type === 'tool' && candidate.itemId === event.itemId);
    if (!item) {
      return;
    }
    const rawFields = event.payload['fields'];
    const fields = Array.isArray(rawFields)
      ? rawFields.filter((field): field is InteractionField => Boolean(field && typeof field === 'object' && 'field' in field))
      : [];
    item.status = 'running';
    item.interaction = {
      interactionId: this.payloadString(event, 'interactionId')!,
      targetTool: this.payloadString(event, 'targetTool') || '',
      title: this.payloadString(event, 'title') || '',
      description: this.payloadString(event, 'description') || '',
      fields,
      values: {},
      status: 'waiting'
    };
  }

  private handleInputCompleted(run: AssistantRun, event: GatewayEvent): void {
    const interactionId = this.payloadString(event, 'interactionId');
    const item = run.items.find(candidate => candidate.type === 'tool' && candidate.interaction?.interactionId === interactionId);
    if (!item?.interaction) {
      return;
    }
    const failed = this.payloadString(event, 'status') === 'failed';
    item.interaction.status = failed ? 'failed' : 'completed';
    item.status = failed ? 'failed' : 'running';
  }

  private handleApprovalCompleted(run: AssistantRun, event: GatewayEvent): void {
    const approvalId = event.payload.approvalId;
    const tool = run.items.find(item => item.type === 'tool' && item.approval?.approvalId === approvalId);
    const approval = tool?.approval || (this.pendingApproval?.approvalId === approvalId ? this.pendingApproval : undefined);
    if (!approval) {
      return;
    }
    const status = this.payloadString(event, 'status');
    approval.status = status === 'rejected' ? 'rejected' : 'approved';
    if (tool) {
      tool.status = approval.status === 'rejected' ? 'failed' : 'running';
    }
    if (this.pendingApproval?.approvalId === approval.approvalId) {
      this.pendingApproval = undefined;
    }
  }

  private ensureTextItem(run: AssistantRun, itemId?: string): AssistantRunItem {
    const stableItemId = itemId || `${run.runUid || 'active'}:text`;
    let item = run.items.find(candidate => candidate.type === 'text' && candidate.itemId === stableItemId);
    if (!item) {
      item = { type: 'text', itemId: stableItemId, status: 'streaming', content: '', pendingContent: '' };
      run.items.push(item);
    }
    return item;
  }

  private ensureToolItem(run: AssistantRun, event: GatewayEvent): AssistantRunItem {
    const toolCallUid = this.payloadString(event, 'toolCallUid');
    const toolInput = this.payloadObject(event, 'arguments');
    const itemId = event.itemId || toolCallUid || `${run.runUid || 'active'}:${event.payload.toolName || 'tool'}`;
    let item = run.items.find(
      candidate =>
        candidate.type === 'tool' && (candidate.itemId === itemId || Boolean(toolCallUid && candidate.toolCallUid === toolCallUid))
    );
    if (!item) {
      item = {
        type: 'tool',
        itemId,
        status: 'running',
        toolName: event.payload.toolName || this.i18nSvc.fanyi('ai.chat.tool.unknown'),
        toolCallUid,
        toolInput,
        toolInputExpanded: false
      };
      run.items.push(item);
    } else {
      item.toolCallUid = toolCallUid || item.toolCallUid;
      item.toolName = event.payload.toolName || item.toolName;
      if (toolInput !== undefined) {
        item.toolInput = toolInput;
        item.toolInputExpanded ??= false;
      }
    }
    return item;
  }

  private scheduleRender(): void {
    if (this.renderFrame !== undefined) {
      return;
    }
    this.renderFrame = requestAnimationFrame(() => {
      this.renderFrame = undefined;
      const run = this.activeAssistantRun();
      run?.items.filter(item => item.type === 'text').forEach(item => this.flushTextItem(item));
      this.cdr.detectChanges();
      this.scheduleScroll();
    });
  }

  private flushTextItem(item: AssistantRunItem, completed = false): void {
    if (item.pendingContent) {
      item.content = `${item.content || ''}${item.pendingContent}`;
      item.pendingContent = '';
    }
    if (completed) {
      item.status = 'completed';
    }
  }

  private finishRun(): void {
    const wasSending = this.isSendingMessage;
    const run = this.activeAssistantRun();
    run?.items.filter(item => item.type === 'text').forEach(item => this.flushTextItem(item, true));
    if (run?.status === 'pending' || run?.status === 'running') {
      run.status = 'completed';
    }
    this.isSendingMessage = false;
    this.isStopping = false;
    this.activeRunUid = undefined;
    this.cdr.detectChanges();
    this.scheduleScroll();
    if (wasSending) {
      this.refreshSessionList();
    }
  }

  private refreshSessionList(): void {
    this.sessionStore.refresh(this.sessionType).subscribe({
      next: persistedSessions => {
        const sessions = persistedSessions.map(session => this.toChatSession(session));
        if (this.currentSession) {
          const refreshed = sessions.find(
            session =>
              session.sessionUid === this.currentSession?.sessionUid || session.conversationId === this.currentSession?.conversationId
          );
          if (refreshed) {
            this.currentSession = refreshed;
          }
        }
        this.cdr.markForCheck();
      }
    });
  }

  private toChatSession(session: AgentSession): ChatSession {
    return {
      conversationId: session.conversationId,
      sessionUid: session.sessionUid,
      title: session.title || this.i18nSvc.fanyi('ai.chat.new-chat'),
      updatedAt: new Date(session.gmtUpdate || session.gmtCreate)
    };
  }

  private toChatTurns(entries: AgentTranscriptEntry[]): ChatTurn[] {
    const turns: ChatTurn[] = [];
    const turnsByRun = new Map<number, ChatTurn>();
    for (const entry of entries) {
      let payload: TranscriptMessage;
      try {
        payload = JSON.parse(entry.payloadJson) as TranscriptMessage;
      } catch {
        continue;
      }
      if (payload.role === 'user') {
        const content = this.transcriptText(payload);
        if (!content) {
          continue;
        }
        const turn: ChatTurn = {
          id: entry.runId ? `run:${entry.runId}` : `entry:${entry.id}`,
          runId: entry.runId,
          user: { content, createdAt: new Date(entry.gmtCreate) },
          assistant: { status: 'completed', items: [], createdAt: new Date(entry.gmtCreate) }
        };
        turns.push(turn);
        if (entry.runId !== undefined) {
          turnsByRun.set(entry.runId, turn);
        }
        continue;
      }
      if (payload.role !== 'assistant') {
        continue;
      }
      const turn = entry.runId !== undefined ? turnsByRun.get(entry.runId) : turns[turns.length - 1];
      if (!turn) {
        continue;
      }
      payload.content?.forEach((block, index) => {
        if (block.type === 'text' && block.text) {
          turn.assistant.items.push({
            type: 'text',
            itemId: `entry:${entry.id}:text:${index}`,
            status: 'completed',
            content: block.text
          });
        } else if (block.type === 'toolCall' && block.name) {
          turn.assistant.items.push({
            type: 'tool',
            itemId: block.id || block.toolCallUid || `entry:${entry.id}:tool:${index}`,
            toolCallUid: block.toolCallUid,
            toolName: block.name,
            toolInput: block.input,
            toolInputExpanded: false,
            status: 'completed'
          });
        }
      });
    }
    return turns;
  }

  private transcriptText(message: TranscriptMessage): string {
    return (message.content || [])
      .filter(block => block.type === 'text' && block.text)
      .map(block => block.text)
      .join('\n');
  }

  private activeAssistantRun(): AssistantRun | undefined {
    return this.turns[this.turns.length - 1]?.assistant;
  }

  private payloadString(event: GatewayEvent, key: string): string | undefined {
    const value = event.payload[key];
    return typeof value === 'string' ? value : undefined;
  }

  private payloadObject(event: GatewayEvent, key: string): Record<string, unknown> | undefined {
    const value = event.payload[key];
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
  }

  private scheduleScroll(force = false): void {
    if ((!force && !this.followOutput) || this.scrollFrame !== undefined) {
      return;
    }
    const scrollToLatest = (): void => {
      const element = this.messagesContainer?.nativeElement;
      if (element && (force || this.followOutput)) {
        element.scrollTop = element.scrollHeight;
      }
    };
    this.scrollFrame = requestAnimationFrame(() => {
      scrollToLatest();
      if (!force) {
        this.scrollFrame = undefined;
        return;
      }
      this.scrollFrame = requestAnimationFrame(() => {
        this.scrollFrame = undefined;
        scrollToLatest();
      });
    });
  }

  private newId(prefix: string): string {
    const bytes = new Uint32Array(2);
    crypto.getRandomValues(bytes);
    return `${prefix}_${Date.now().toString(36)}_${bytes[0].toString(36)}${bytes[1].toString(36)}`;
  }
}
