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

import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { I18NService } from '@core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';

import { AiChatService, ChatMessage, ConversationDto } from '../../../service/ai-chat.service';
import { OpenAiConfigService, OpenAiConfig, OpenAiConfigStatus } from '../../../service/openai-config.service';
import { ThemeService } from '../../../service/theme.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.less']
})
export class ChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  conversations: ConversationDto[] = [];
  currentConversation: ConversationDto | null = null;
  messages: ChatMessage[] = [];
  newMessage = '';
  isLoading = false;
  sidebarCollapsed = false;
  theme: string = 'default';

  // OpenAI Configuration
  isOpenAiConfigured = false;
  showConfigModal = false;
  configLoading = false;
  openAiConfig: OpenAiConfig = {
    enable: false,
    apiKey: ''
  };

  constructor(
    private aiChatService: AiChatService,
    private message: NzMessageService,
    private modal: NzModalService,
    private i18n: I18NService,
    private cdr: ChangeDetectorRef,
    private themeSvc: ThemeService,
    private openAiConfigService: OpenAiConfigService
  ) {}

  ngOnInit(): void {
    this.theme = this.themeSvc.getTheme() || 'default';
    this.checkOpenAiConfiguration();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  /**
   * Load all conversations
   */
  loadConversations(): void {
    console.log('Loading conversations...');
    this.aiChatService.getConversations().subscribe({
      next: response => {
        console.log('Conversations response:', response);
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
          this.message.error(`Failed to load conversations: ${response.msg || 'Unknown error'}`);
        }
      },
      error: error => {
        console.error('Error loading conversations:', error);
        this.message.error(`Failed to load conversations: ${error.status} ${error.statusText || error.message}`);

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
    console.log('Creating new conversation...');
    this.aiChatService.createConversation().subscribe({
      next: response => {
        console.log('Create conversation response:', response);
        if (response.code === 0 && response.data) {
          const newConversation = response.data;
          this.conversations.unshift(newConversation);
          this.selectConversation(newConversation);
          this.message.success('New conversation created');
        } else {
          console.error('Error in create conversation response:', response);
          this.message.error(`Failed to create conversation: ${response.msg || 'Unknown error'}`);
        }
      },
      error: error => {
        console.error('Error creating conversation:', error);
        this.message.error(`Failed to create new conversation: ${error.status} ${error.statusText || error.message}`);

        // Create fallback conversation
        this.createFallbackConversation();
      }
    });
  }

  /**
   * Create a fallback conversation when API is not available
   */
  createFallbackConversation(): void {
    const fallbackConversation: ConversationDto = {
      conversationId: `fallback-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: []
    };

    this.conversations = [fallbackConversation];
    this.selectConversation(fallbackConversation);

    this.message.warning('AI Chat service unavailable. Running in offline mode.');
  }

  /**
   * Select a conversation and load its messages
   */
  selectConversation(conversation: ConversationDto): void {
    this.currentConversation = conversation;
    this.loadConversationHistory(conversation.conversationId);
  }

  /**
   * Load conversation history from the API
   */
  loadConversationHistory(conversationId: string): void {
    this.isLoading = true;

    this.aiChatService.getConversation(conversationId).subscribe({
      next: response => {
        this.isLoading = false;
        console.log('Conversation history response:', response);

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
        this.isLoading = false;
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
  deleteConversation(conversation: ConversationDto, event: Event): void {
    event.stopPropagation();

    this.modal.confirm({
      nzTitle: 'Delete Conversation',
      nzContent: 'Are you sure you want to delete this conversation?',
      nzOkText: 'Delete',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzOnOk: () => {
        this.aiChatService.deleteConversation(conversation.conversationId).subscribe({
          next: response => {
            if (response.code === 0) {
              // Remove from conversations list
              this.conversations = this.conversations.filter(c => c.conversationId !== conversation.conversationId);

              // If this was the current conversation, select another or create new
              if (this.currentConversation?.conversationId === conversation.conversationId) {
                if (this.conversations.length > 0) {
                  this.selectConversation(this.conversations[0]);
                } else {
                  this.createNewConversation();
                }
              }

              this.message.success('Conversation deleted');
            }
          },
          error: error => {
            console.error('Error deleting conversation:', error);
            this.message.error('Failed to delete conversation');
          }
        });
      }
    });
  }

  /**
   * Send a message
   */
  sendMessage(): void {
    if (!this.newMessage.trim() || this.isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      content: this.newMessage.trim(),
      role: 'user',
      timestamp: new Date()
    };

    // Add user message to the messages list
    this.messages.push(userMessage);

    const messageContent = this.newMessage.trim();
    this.newMessage = '';
    this.isLoading = true;
    this.cdr.detectChanges();
    this.scrollToBottom();

    // Check if this is a fallback conversation
    if (this.currentConversation?.conversationId.startsWith('fallback-')) {
      console.log('Fallback mode - showing offline message');
      setTimeout(() => {
        const offlineMessage: ChatMessage = {
          content:
            'I apologize, but the AI Chat service is currently unavailable. Please ensure the HertzBeat AI Agent module is running and try again later.',
          role: 'assistant',
          timestamp: new Date()
        };
        this.messages.push(offlineMessage);
        this.isLoading = false;
        this.cdr.detectChanges();
        this.scrollToBottom();
      }, 1000);
      return;
    }

    // Create empty assistant message for streaming
    const assistantMessage: ChatMessage = {
      content: '',
      role: 'assistant',
      timestamp: new Date()
    };
    this.messages.push(assistantMessage);
    this.cdr.detectChanges();
    this.scrollToBottom();

    // Send to AI service
    console.log('Sending message to AI service:', messageContent);
    this.aiChatService.streamChat(messageContent, this.currentConversation?.conversationId).subscribe({
      next: chunk => {
        console.log('Received stream chunk:', chunk);

        // Find the last assistant message and append content
        const lastMessage = this.messages[this.messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          // Accumulate the content for streaming effect
          lastMessage.content += chunk.content;
          lastMessage.timestamp = chunk.timestamp instanceof Date ? chunk.timestamp : new Date();

          this.cdr.detectChanges();
          this.scrollToBottom();
        }
      },
      error: error => {
        console.error('Error in chat stream:', error);
        this.message.error(`Failed to get AI response: ${error.status} ${error.statusText || error.message}`);

        // Remove the empty assistant message and add error message
        if (
          this.messages.length > 0 &&
          this.messages[this.messages.length - 1].role === 'assistant' &&
          this.messages[this.messages.length - 1].content === ''
        ) {
          this.messages.pop();
        }

        const errorMessage: ChatMessage = {
          content: 'Sorry, there was an error processing your request. Please check if the AI Agent service is running and try again.',
          role: 'assistant',
          timestamp: new Date()
        };
        this.messages.push(errorMessage);
        this.isLoading = false;
        this.cdr.detectChanges();
        this.scrollToBottom();
      },
      complete: () => {
        console.log('Chat stream completed');
        this.isLoading = false;
        this.cdr.detectChanges();

        // Refresh current conversation to get updated data (only if not fallback)
        if (this.currentConversation && !this.currentConversation.conversationId.startsWith('fallback-')) {
          this.aiChatService.getConversation(this.currentConversation.conversationId).subscribe({
            next: response => {
              if (response.code === 0 && response.data) {
                // Update conversation in the list
                const index = this.conversations.findIndex(c => c.conversationId === response.data!.conversationId);
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
  getConversationTitle(conversation: ConversationDto): string {
    if (conversation.messages && conversation.messages.length > 0) {
      const firstUserMessage = conversation.messages.find(m => m.role === 'user');
      if (firstUserMessage) {
        return firstUserMessage.content.length > 30 ? `${firstUserMessage.content.substring(0, 30)}...` : firstUserMessage.content;
      }
    }
    return `Conversation ${conversation.conversationId.substring(0, 8)}`;
  }

  /**
   * Format time
   */
  formatTime(date: Date): string {
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
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
   * Scroll to bottom of messages
   */
  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  /**
   * Check OpenAI configuration status
   */
  checkOpenAiConfiguration(): void {
    this.openAiConfigService.getOpenAiConfigStatus().subscribe({
      next: response => {
        if (response.code === 0) {
          this.isOpenAiConfigured = response.data.configured;
          if (this.isOpenAiConfigured) {
            this.loadConversations();
          } else {
            this.showOpenAiConfigDialog(response.data);
          }
        } else {
          console.error('Failed to check OpenAI configuration:', response.msg);
          this.showOpenAiConfigDialog();
        }
      },
      error: error => {
        console.error('Error checking OpenAI configuration:', error);
        this.showOpenAiConfigDialog();
      }
    });
  }

  /**
   * Show OpenAI configuration dialog
   */
  showOpenAiConfigDialog(status?: OpenAiConfigStatus): void {
    // Load existing configuration if available
    this.loadOpenAiConfig();

    let contentMessage = `
      <div style="margin-bottom: 16px;">
        <p>To use AI Agent Chat, please configure your OpenAI API key.</p>
    `;

    if (status && !status.validationPassed && status.validationMessage) {
      contentMessage += `
        <div style="margin-bottom: 12px; padding: 8px; background: #fff2f0; border: 1px solid #ffccc7; border-radius: 4px;">
          <strong>Configuration Issue:</strong> ${status.validationMessage}
        </div>
      `;
    }

    contentMessage += `
        <p>You can either:</p>
        <ul>
          <li>Configure it here (stored in database)</li>
          <li>Add it to your application.yml file under <code>spring.ai.openai.api-key</code></li>
        </ul>
      </div>
    `;

    const modalRef = this.modal.create({
      nzTitle: 'OpenAI Configuration Required',
      nzContent: contentMessage,
      nzWidth: 600,
      nzClosable: false,
      nzMaskClosable: false,
      nzFooter: [
        {
          label: 'Configure Here',
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
   * Load OpenAI configuration
   */
  loadOpenAiConfig(): void {
    this.openAiConfigService.getOpenAiConfig().subscribe({
      next: response => {
        if (response.code === 0 && response.data) {
          this.openAiConfig = { ...this.openAiConfig, ...response.data };
        }
      },
      error: error => {
        console.error('Failed to load OpenAI config:', error);
      }
    });
  }

  /**
   * Show configuration modal
   */
  onShowConfigModal(): void {
    this.loadOpenAiConfig();
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
  onSaveOpenAiConfig(): void {
    if (!this.openAiConfig.apiKey.trim()) {
      this.message.error('API Key is required');
      return;
    }

    // Always enable when saving an API key
    this.openAiConfig.enable = true;

    this.configLoading = true;
    this.message.info('Validating API key...', { nzDuration: 2000 });

    this.openAiConfigService.saveOpenAiConfig(this.openAiConfig).subscribe({
      next: response => {
        this.configLoading = false;
        if (response.code === 0) {
          this.message.success('OpenAI API key validated and saved successfully!');
          this.showConfigModal = false;
          this.isOpenAiConfigured = true;
          this.loadConversations();
        } else {
          // Check if it's a validation error
          if (response.msg.includes('validation failed')) {
            this.message.error(`❌ API Key validation failed: ${response.msg}`, { nzDuration: 5000 });
          } else {
            this.message.error(`Failed to save configuration: ${response.msg}`);
          }
        }
      },
      error: error => {
        this.configLoading = false;
        this.message.error(`Failed to save configuration: ${error.message}`);
      }
    });
  }
}
