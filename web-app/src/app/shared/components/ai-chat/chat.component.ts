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

import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef, OnDestroy, Inject } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';

import { ModelProviderConfig, PROVIDER_OPTIONS, ProviderOption } from '../../../pojo/ModelProviderConfig';
import { AiChatService, ChatMessage, ChatConversation, SopSchedule, SkillInfo } from '../../../service/ai-chat.service';
import { GeneralConfigService } from '../../../service/general-config.service';
import { ThemeService } from '../../../service/theme.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.less']
})
export class ChatComponent implements OnInit, OnDestroy {
  /**
   * Marker for skill report content that should be displayed directly to users
   * without further AI processing.
   */
  private readonly SKILL_REPORT_MARKER = '[[SKILL_REPORT]]';

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  conversations: ChatConversation[] = [];
  currentConversation: ChatConversation | null = null;
  messages: ChatMessage[] = [];
  newMessage = '';
  initialMessage = '';
  isLoadingConversations = false;
  isSendingMessage = false;
  sidebarCollapsed = false;
  theme: string = 'default';
  private scrollTimeout: any;

  // Provider Configuration
  isAiProviderConfigured = false;
  showConfigModal = false;
  configLoading = false;
  aiProviderConfig: ModelProviderConfig = new ModelProviderConfig();
  providerOptions: ProviderOption[] = PROVIDER_OPTIONS;

  // Schedule Configuration
  showScheduleModal = false;
  scheduleLoading = false;
  schedules: SopSchedule[] = [];
  availableSkills: SkillInfo[] = [];
  newSchedule: Partial<SopSchedule> = {
    sopName: '',
    cronExpression: '',
    enabled: true
  };
  editingSchedule: SopSchedule | null = null;

  constructor(
    private aiChatService: AiChatService,
    private message: NzMessageService,
    private modal: NzModalService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService,
    private cdr: ChangeDetectorRef,
    private themeSvc: ThemeService,
    private generalConfigSvc: GeneralConfigService
  ) {}

  ngOnInit(): void {
    this.theme = this.themeSvc.getTheme() || 'default';
    // Always load conversations first, regardless of AI configuration status
    this.loadConversations();
    this.checkAiConfiguration();
    if (this.initialMessage) {
      this.newMessage = this.initialMessage;
      setTimeout(() => this.sendMessage(), 800);
    }
  }

  ngOnDestroy(): void {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
  }

  /**
   * Debounced scroll to bottom to improve performance
   */
  private scrollToBottomDebounced(): void {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    this.scrollTimeout = setTimeout(() => {
      this.scrollToBottom();
    }, 100);
  }

  /**
   * Load all conversations
   */
  loadConversations(): void {
    this.aiChatService.getConversations().subscribe({
      next: response => {
        if (response.code === 0 && response.data) {
          this.conversations = response.data;
          // If no current conversation, create a new one
          if (this.conversations.length === 0) {
            this.createNewConversation();
          } else {
            // Select the most recent conversation
            this.selectConversation(this.conversations[0]);
          }
        } else {
          console.error('Error in conversations response:', response);
          this.message.error(`${this.i18nSvc.fanyi('ai.chat.error.conversations.load')}: ${response.msg || 'Unknown error'}`);
        }
      },
      error: error => {
        console.error('Error loading conversations:', error);
        this.message.error(
          `${this.i18nSvc.fanyi('ai.chat.error.conversations.load')}: ${error.status} ${error.statusText || error.message}`
        );

        // Create a fallback new conversation if API is not available
        console.log('Creating fallback conversation...');
        this.createFallbackConversation();
      }
    });
  }

  /**
   * Create a new conversation
   */
  createNewConversation(): void {
    this.aiChatService.createConversation().subscribe({
      next: response => {
        if (response.code === 0 && response.data) {
          const newConversation = response.data;
          this.conversations.unshift(newConversation);
          this.selectConversation(newConversation);
          this.message.success(this.i18nSvc.fanyi('ai.chat.conversation.created'));
        } else {
          console.error('Error in create conversation response:', response);
          this.message.error(`${this.i18nSvc.fanyi('ai.chat.error.conversation.create')}: ${response.msg || 'Unknown error'}`);
        }
      },
      error: error => {
        console.error('Error creating conversation:', error);
        this.message.error(
          `${this.i18nSvc.fanyi('ai.chat.error.conversation.create')}: ${error.status} ${error.statusText || error.message}`
        );

        // Create fallback conversation
        this.createFallbackConversation();
      }
    });
  }

  /**
   * Create a fallback conversation when API is not available
   */
  createFallbackConversation(): void {
    const fallbackConversation: ChatConversation = {
      id: 0,
      title: 'Offline Conversation',
      gmtCreated: new Date(),
      gmtUpdate: new Date(),
      messages: []
    };

    this.conversations = [fallbackConversation];
    this.selectConversation(fallbackConversation);

    this.message.warning(this.i18nSvc.fanyi('ai.chat.offline.mode'));
  }

  /**
   * Select a conversation and load its messages
   */
  selectConversation(conversation: ChatConversation): void {
    this.currentConversation = conversation;
    this.loadConversationHistory(conversation.id);
  }

  /**
   * Load conversation history from the API
   */
  loadConversationHistory(conversationId: number): void {
    this.isLoadingConversations = true;

    this.aiChatService.getConversation(conversationId).subscribe({
      next: response => {
        this.isLoadingConversations = false;

        if (response.code === 0 && response.data) {
          this.messages = response.data.messages || [];
          this.cdr.detectChanges();
          this.scrollToBottom();
        } else {
          console.error('Error loading conversation history:', response);
          // Fallback to the messages from the conversation list if API fails
          this.messages = this.currentConversation?.messages || [];
          this.cdr.detectChanges();
          this.scrollToBottom();
        }
      },
      error: error => {
        this.isLoadingConversations = false;
        console.error('Error loading conversation history:', error);
        // Fallback to the messages from the conversation list if API fails
        this.messages = this.currentConversation?.messages || [];
        this.cdr.detectChanges();
        this.scrollToBottom();
      }
    });
  }

  /**
   * Delete a conversation
   */
  deleteConversation(conversation: ChatConversation, event: Event): void {
    event.stopPropagation();

    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('ai.chat.conversation.delete.title'),
      nzContent: this.i18nSvc.fanyi('ai.chat.conversation.delete.content'),
      nzOkText: this.i18nSvc.fanyi('ai.chat.conversation.delete.confirm'),
      nzOkType: 'primary',
      nzOkDanger: true,
      nzOnOk: () => {
        this.aiChatService.deleteConversation(conversation.id).subscribe({
          next: response => {
            if (response.code === 0) {
              // Remove from conversations list
              this.conversations = this.conversations.filter(c => c.id !== conversation.id);

              // If this was the current conversation, select another or create new
              if (this.currentConversation?.id === conversation.id) {
                if (this.conversations.length > 0) {
                  this.selectConversation(this.conversations[0]);
                } else {
                  this.createNewConversation();
                }
              }

              this.message.success(this.i18nSvc.fanyi('ai.chat.conversation.delete.success'));
            }
          },
          error: error => {
            console.error('Error deleting conversation:', error);
            this.message.error(this.i18nSvc.fanyi('ai.chat.conversation.delete.failed'));
          }
        });
      }
    });
  }

  /**
   * Send a message
   */
  sendMessage(): void {
    if (!this.newMessage.trim() || this.isSendingMessage) {
      return;
    }

    const userMessage: ChatMessage = {
      content: this.newMessage.trim(),
      role: 'user',
      gmtCreate: new Date()
    };

    // Add user message to the messages list
    this.messages.push(userMessage);

    const messageContent = this.newMessage.trim();
    this.newMessage = '';
    this.isSendingMessage = true;
    this.cdr.detectChanges();
    this.scrollToBottom();

    // Check if this is a fallback conversation
    if (this.currentConversation?.id == 0) {
      setTimeout(() => {
        const offlineMessage: ChatMessage = {
          content: this.i18nSvc.fanyi('ai.chat.offline.response'),
          role: 'assistant',
          gmtCreate: new Date()
        };
        this.messages.push(offlineMessage);
        this.isSendingMessage = false;
        this.cdr.detectChanges();
        this.scrollToBottom();
      }, 1000);
      return;
    }

    // Create empty assistant message for streaming
    const assistantMessage: ChatMessage = {
      content: '',
      role: 'assistant',
      gmtCreate: new Date()
    };
    this.messages.push(assistantMessage);
    this.cdr.detectChanges();
    this.scrollToBottom();

    // Send to AI service
    this.aiChatService.streamChat(messageContent, this.currentConversation?.id).subscribe({
      next: chunk => {
        // Find the last assistant message and append content
        const lastMessage = this.messages[this.messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          // Accumulate the content for streaming effect
          lastMessage.content += chunk.content;
          lastMessage.gmtCreate = chunk.gmtCreate;

          // Check for skill report marker and process it
          if (lastMessage.content.includes(this.SKILL_REPORT_MARKER)) {
            lastMessage.content = this.processSkillReportContent(lastMessage.content);
            lastMessage.isSkillReport = true;
          }

          this.cdr.detectChanges();
          this.scrollToBottom();
        }
      },
      error: error => {
        console.error('Error in chat stream:', error);
        this.message.error(`${this.i18nSvc.fanyi('ai.chat.error.chat.response')}: ${error.status} ${error.statusText || error.message}`);

        // Remove the empty assistant message and add error message
        if (
          this.messages.length > 0 &&
          this.messages[this.messages.length - 1].role === 'assistant' &&
          this.messages[this.messages.length - 1].content === ''
        ) {
          this.messages.pop();
        }

        const errorMessage: ChatMessage = {
          content: this.i18nSvc.fanyi('ai.chat.error.processing'),
          role: 'assistant',
          gmtCreate: new Date()
        };
        this.messages.push(errorMessage);
        this.isSendingMessage = false;
        this.cdr.detectChanges();
        this.scrollToBottom();
      },
      complete: () => {
        this.isSendingMessage = false;
        this.cdr.detectChanges();

        // Refresh current conversation to get updated data (only if not fallback)
        if (this.currentConversation && this.currentConversation.id !== 0) {
          this.aiChatService.getConversation(this.currentConversation.id).subscribe({
            next: response => {
              if (response.code === 0 && response.data) {
                // Update conversation in the list
                const index = this.conversations.findIndex(c => c.id === response.data!.id);
                if (index >= 0) {
                  this.conversations[index] = response.data;
                }
                this.currentConversation = response.data;
              }
            },
            error: error => {
              console.log('Error refreshing conversation (non-critical):', error);
            }
          });
        }
      }
    });
  }

  /**
   * Handle Enter key press
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * Toggle sidebar
   */
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  /**
   * Format conversation title
   */
  getConversationTitle(conversation: ChatConversation): string {
    if (conversation.title) {
      return conversation.title;
    }
    if (conversation.messages && conversation.messages.length > 0) {
      const firstUserMessage = conversation.messages.find(m => m.role === 'user');
      if (firstUserMessage) {
        return firstUserMessage.content.length > 30 ? `${firstUserMessage.content.substring(0, 30)}...` : firstUserMessage.content;
      }
    }
    return `Conversation ${conversation.id}`;
  }

  /**
   * Format time
   */
  formatTime(date: any): string {
    date = new Date(date);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Process message content to ensure it's properly handled
   */
  processMessage(message: ChatMessage): void {
    // Handle Promise content
    if (typeof message.content === 'object' && message.content !== null && 'then' in message.content) {
      (message.content as Promise<any>)
        .then((content: any) => {
          message.content = String(content || '');
          this.cdr.detectChanges();
        })
        .catch((error: any) => {
          console.error('Error processing message content:', error);
          message.content = 'Error loading message content';
          this.cdr.detectChanges();
        });
    } else {
      // Ensure content is always a string
      message.content = String(message.content || '');
    }
  }

  /**
   * Process skill report content by removing the marker and extracting the report.
   * Skill reports are directly displayed to users without further AI processing.
   */
  private processSkillReportContent(content: string): string {
    // Remove the marker and return the report content
    const markerIndex = content.indexOf(this.SKILL_REPORT_MARKER);
    if (markerIndex !== -1) {
      // Extract content after the marker
      let reportContent = content.substring(markerIndex + this.SKILL_REPORT_MARKER.length);
      // Remove leading newlines
      reportContent = reportContent.replace(/^\n+/, '');
      return reportContent;
    }
    return content;
  }

  /**
   * Scroll to bottom of messages with smooth animation
   */
  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        // Use requestAnimationFrame for better performance
        requestAnimationFrame(() => {
          element.scrollTo({
            top: element.scrollHeight,
            behavior: 'smooth'
          });
        });
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  /**
   * Check provider configuration status
   */
  checkAiConfiguration(): void {
    this.generalConfigSvc.getModelProviderConfig().subscribe({
      next: response => {
        if (response.code === 0 && response.data) {
          this.aiProviderConfig = response.data;
          // Ensure default values are set if not present
          if (!this.aiProviderConfig.code) {
            this.aiProviderConfig.code = 'openai';
          }
          if (!this.aiProviderConfig.baseUrl) {
            const defaultProvider = this.providerOptions.find(p => p.value === this.aiProviderConfig.code);
            if (defaultProvider) {
              this.aiProviderConfig.baseUrl = defaultProvider.defaultBaseUrl;
            }
          }
          if (!this.aiProviderConfig.model) {
            const defaultProvider = this.providerOptions.find(p => p.value === this.aiProviderConfig.code);
            if (defaultProvider) {
              this.aiProviderConfig.model = defaultProvider.defaultModel;
            }
          }
          // Don't load conversations here anymore - they're loaded in ngOnInit
        } else {
          // Initialize with default values if no config exists
          this.aiProviderConfig = new ModelProviderConfig();
          this.showAiProviderConfigDialog();
        }
      },
      error: error => {
        console.error('Failed to load model provider config:', error);
        this.aiProviderConfig = new ModelProviderConfig();
        this.showAiProviderConfigDialog();
      }
    });
  }

  /**
   * Show ai configuration dialog
   */
  showAiProviderConfigDialog(error?: string): void {
    let contentMessage = `
      <div style="margin-bottom: 16px;">
        <p>${this.i18nSvc.fanyi('ai.chat.config.required.content')}</p>
    `;

    if (error) {
      contentMessage += `
        <div style="margin-bottom: 12px; padding: 8px; background: #fff2f0; border: 1px solid #ffccc7; border-radius: 4px;">
          <strong>${this.i18nSvc.fanyi('ai.chat.config.required.error')}</strong> ${error}
        </div>
      `;
    }

    const modalRef = this.modal.create({
      nzTitle: this.i18nSvc.fanyi('ai.chat.config.required.title'),
      nzContent: contentMessage,
      nzWidth: 600,
      nzClosable: false,
      nzMaskClosable: false,
      nzFooter: [
        {
          label: this.i18nSvc.fanyi('ai.chat.config.required.button'),
          type: 'primary',
          onClick: () => {
            this.showConfigModal = true;
            modalRef.destroy();
          }
        }
      ]
    });
  }

  /**
   * Show configuration modal
   */
  onShowConfigModal(): void {
    this.checkAiConfiguration();
    this.showConfigModal = true;
  }

  /**
   * Close configuration modal
   */
  onCloseConfigModal(): void {
    this.showConfigModal = false;
  }

  /**
   * Save OpenAI configuration
   */
  onSaveAiProviderConfig(): void {
    if (!this.aiProviderConfig.apiKey?.trim()) {
      this.message.error(this.i18nSvc.fanyi('ai.chat.error.api.key'));
      return;
    }

    if (!this.aiProviderConfig.code?.trim()) {
      this.message.error(this.i18nSvc.fanyi('ai.chat.error.provider'));
      return;
    }

    if (!this.aiProviderConfig.baseUrl?.trim()) {
      this.message.error(this.i18nSvc.fanyi('ai.chat.error.base.url'));
      return;
    }

    if (!this.aiProviderConfig.model?.trim()) {
      this.message.error(this.i18nSvc.fanyi('ai.chat.error.model'));
      return;
    }

    this.configLoading = true;

    this.generalConfigSvc.saveModelProviderConfig(this.aiProviderConfig).subscribe({
      next: response => {
        this.configLoading = false;
        if (response.code === 0) {
          this.message.success(this.i18nSvc.fanyi('ai.chat.config.save.success'));
          this.showConfigModal = false;
          this.isAiProviderConfigured = true;
          this.loadConversations();
        } else {
          // Check if it's a validation error
          if (response.msg.includes('validation failed')) {
            this.message.error(`${this.i18nSvc.fanyi('ai.chat.config.validation.failed')} ${response.msg}`, { nzDuration: 5000 });
          } else {
            this.message.error(`${this.i18nSvc.fanyi('ai.chat.config.save.failed')} ${response.msg}`);
          }
        }
      },
      error: error => {
        this.configLoading = false;
        this.message.error(`${this.i18nSvc.fanyi('ai.chat.config.save.failed')} ${error.message}`);
      }
    });
  }

  /**
   * Handle provider selection change
   */
  onProviderChange(provider: string): void {
    const selectedProvider = this.providerOptions.find(p => p.value === provider);
    if (selectedProvider) {
      this.aiProviderConfig.code = provider;
      // Auto-fill default values if current values are empty
      if (!this.aiProviderConfig.baseUrl) {
        this.aiProviderConfig.baseUrl = selectedProvider.defaultBaseUrl;
      }
      if (!this.aiProviderConfig.model) {
        this.aiProviderConfig.model = selectedProvider.defaultModel;
      }
    }
  }

  /**
   * Reset to default values for selected provider
   */
  resetToDefaults(): void {
    const selectedProvider = this.providerOptions.find(p => p.value === this.aiProviderConfig.code);
    if (selectedProvider) {
      this.aiProviderConfig.baseUrl = selectedProvider.defaultBaseUrl;
      this.aiProviderConfig.model = selectedProvider.defaultModel;
    }
  }

  // ===== Schedule Management Methods =====

  /**
   * Show schedule configuration modal
   */
  onShowScheduleModal(): void {
    if (!this.currentConversation) {
      this.message.warning('请先选择或创建一个对话');
      return;
    }
    this.showScheduleModal = true;
    this.loadSchedules();
    this.loadAvailableSkills();
  }

  /**
   * Close schedule modal
   */
  onCloseScheduleModal(): void {
    this.showScheduleModal = false;
  }

  /**
   * Load available SOP skills from backend
   */
  loadAvailableSkills(): void {
    this.aiChatService.getAvailableSkills().subscribe({
      next: response => {
        if (response.code === 0 && response.data) {
          this.availableSkills = response.data;
        }
      },
      error: error => {
        console.error('Error loading skills:', error);
        // Fallback to empty - user will see nothing in dropdown
      }
    });
  }

  /**
   * Load schedules for current conversation
   */
  loadSchedules(): void {
    if (!this.currentConversation) return;

    this.aiChatService.getSchedules(this.currentConversation.id).subscribe({
      next: response => {
        if (response.code === 0 && response.data) {
          this.schedules = response.data;
        }
      },
      error: error => {
        console.error('Error loading schedules:', error);
        this.message.error('加载定时任务失败');
      }
    });
  }

  /**
   * Create a new schedule
   */
  onCreateSchedule(): void {
    if (!this.currentConversation || !this.newSchedule.sopName || !this.newSchedule.cronExpression) {
      return;
    }

    this.scheduleLoading = true;
    const schedule: SopSchedule = {
      conversationId: this.currentConversation.id,
      sopName: this.newSchedule.sopName,
      cronExpression: this.newSchedule.cronExpression,
      enabled: true
    };

    this.aiChatService.createSchedule(schedule).subscribe({
      next: response => {
        this.scheduleLoading = false;
        if (response.code === 0 && response.data) {
          this.schedules.push(response.data);
          this.newSchedule = { sopName: '', cronExpression: '', enabled: true };
          this.message.success(this.i18nSvc.fanyi('ai.chat.schedule.create.success'));
        } else {
          this.message.error(`${this.i18nSvc.fanyi('ai.chat.schedule.create.failed')}: ${response.msg}`);
        }
      },
      error: error => {
        this.scheduleLoading = false;
        console.error('Error creating schedule:', error);
        this.message.error(this.i18nSvc.fanyi('ai.chat.schedule.create.failed'));
      }
    });
  }

  /**
   * Toggle schedule enabled status
   */
  onToggleSchedule(schedule: SopSchedule): void {
    if (!schedule.id) return;

    this.aiChatService.toggleSchedule(schedule.id, schedule.enabled).subscribe({
      next: response => {
        if (response.code === 0) {
          this.message.success(this.i18nSvc.fanyi('ai.chat.schedule.toggle.success'));
        } else {
          schedule.enabled = !schedule.enabled; // Revert on error
          this.message.error(`${this.i18nSvc.fanyi('ai.chat.schedule.toggle.failed')}: ${response.msg}`);
        }
      },
      error: error => {
        schedule.enabled = !schedule.enabled; // Revert on error
        console.error('Error toggling schedule:', error);
        this.message.error(this.i18nSvc.fanyi('ai.chat.schedule.toggle.failed'));
      }
    });
  }

  /**
   * Delete a schedule
   */
  onDeleteSchedule(schedule: SopSchedule): void {
    if (!schedule.id) return;

    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('ai.chat.conversation.delete.title'),
      nzContent: `${this.i18nSvc.fanyi('ai.chat.conversation.delete.content')} "${schedule.sopName}"`,
      nzOkText: this.i18nSvc.fanyi('ai.chat.conversation.delete.confirm'),
      nzOkDanger: true,
      nzOnOk: () => {
        this.aiChatService.deleteSchedule(schedule.id!).subscribe({
          next: response => {
            if (response.code === 0) {
              this.schedules = this.schedules.filter(s => s.id !== schedule.id);
              this.message.success(this.i18nSvc.fanyi('ai.chat.schedule.delete.success'));
            } else {
              this.message.error(`${this.i18nSvc.fanyi('ai.chat.schedule.delete.failed')}: ${response.msg}`);
            }
          },
          error: error => {
            console.error('Error deleting schedule:', error);
            this.message.error(this.i18nSvc.fanyi('ai.chat.schedule.delete.failed'));
          }
        });
      }
    });
  }

  /**
   * Start editing a schedule
   */
  onEditSchedule(schedule: SopSchedule): void {
    this.editingSchedule = { ...schedule };
  }

  /**
   * Cancel editing
   */
  onCancelEdit(): void {
    this.editingSchedule = null;
  }

  /**
   * Update an existing schedule
   */
  onUpdateSchedule(): void {
    if (!this.editingSchedule || !this.editingSchedule.id) return;

    this.scheduleLoading = true;
    this.aiChatService.updateSchedule(this.editingSchedule.id, this.editingSchedule).subscribe({
      next: response => {
        this.scheduleLoading = false;
        if (response.code === 0 && response.data) {
          // Update the schedule in the list
          const index = this.schedules.findIndex(s => s.id === this.editingSchedule!.id);
          if (index !== -1) {
            this.schedules[index] = response.data;
          }
          this.editingSchedule = null;
          this.message.success(this.i18nSvc.fanyi('ai.chat.schedule.update.success'));
        } else {
          this.message.error(`${this.i18nSvc.fanyi('ai.chat.schedule.update.failed')}: ${response.msg}`);
        }
      },
      error: error => {
        this.scheduleLoading = false;
        console.error('Error updating schedule:', error);
        this.message.error(this.i18nSvc.fanyi('ai.chat.schedule.update.failed'));
      }
    });
  }
}
