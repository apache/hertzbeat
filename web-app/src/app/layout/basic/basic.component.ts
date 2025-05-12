import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN, SettingsService, User } from '@delon/theme';
import { LayoutDefaultOptions } from '@delon/theme/layout-default';
import { environment } from '@env/environment';
import { Observable, Subject, of } from 'rxjs';
import { delay, tap, finalize, catchError, takeUntil } from 'rxjs/operators';

import { CONSTANTS } from '../../shared/constants';
import { AiBotService, ChatMessage } from '../../shared/services/ai-bot.service';

@Component({
  selector: 'layout-basic',
  template: `
    <layout-default [options]="options" [nav]="navTpl" [content]="contentTpl" [customError]="null">
      <layout-default-header-item direction="left">
        <a layout-default-header-item-trigger href="//github.com/apache/hertzbeat" target="_blank">
          <i nz-icon nzType="github"></i>
        </a>
      </layout-default-header-item>

      <layout-default-header-item direction="left" hidden="pc">
        <div layout-default-header-item-trigger (click)="searchToggleStatus = !searchToggleStatus">
          <i nz-icon nzType="search"></i>
        </div>
      </layout-default-header-item>
      <layout-default-header-item direction="middle">
        <header-search class="alain-default__search" [toggleChange]="searchToggleStatus"></header-search>
      </layout-default-header-item>
      <layout-default-header-item direction="right" hidden="mobile">
        <header-notify></header-notify>
      </layout-default-header-item>
      <layout-default-header-item direction="right" hidden="mobile">
        <a layout-default-header-item-trigger routerLink="/passport/lock">
          <i nz-icon nzType="lock"></i>
        </a>
      </layout-default-header-item>
      <layout-default-header-item direction="right" hidden="mobile">
        <div layout-default-header-item-trigger nz-dropdown [nzDropdownMenu]="settingsMenu" nzTrigger="click" nzPlacement="bottomRight">
          <i nz-icon nzType="setting"></i>
        </div>
        <nz-dropdown-menu #settingsMenu="nzDropdownMenu">
          <div nz-menu style="width: 200px;">
            <div nz-menu-item>
              <header-fullscreen></header-fullscreen>
            </div>
            <div nz-menu-item routerLink="/setting/labels">
              <i nz-icon nzType="tag" class="mr-sm"></i>
              <span style="margin-left: 4px">{{ 'menu.advanced.labels' | i18n }}</span>
            </div>
            <div nz-menu-item>
              <header-i18n></header-i18n>
            </div>
          </div>
        </nz-dropdown-menu>
      </layout-default-header-item>
      <layout-default-header-item direction="right">
        <header-user></header-user>
      </layout-default-header-item>
      <ng-template #navTpl>
        <layout-default-nav class="d-block py-lg" openStrictly="true"></layout-default-nav>
      </ng-template>
      <ng-template #contentTpl>
        <router-outlet></router-outlet>
      </ng-template>
    </layout-default>
    <global-footer>
      <div style="margin-top: 30px">
        Apache HertzBeat (incubating) {{ version }}<br />
        Copyright &copy; {{ currentYear }}
        <a href="https://hertzbeat.apache.org" target="_blank">Apache HertzBeat</a>
        <br />
        Licensed under the Apache License, Version 2.0
      </div>
    </global-footer>
    <setting-drawer *ngIf="showSettingDrawer"></setting-drawer>

    <!-- AI Chatbot -->
    <div class="ai-chatbot-container">
      <div class="ai-chatbot-button" (click)="toggleChatbot()" *ngIf="!isChatbotOpen">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="28"
          height="28"
          fill="white"
          style="min-width:28px; min-height:28px;"
        >
          <path
            d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5A2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5a2.5 2.5 0 0 0 2.5 2.5a2.5 2.5 0 0 0 2.5-2.5a2.5 2.5 0 0 0-2.5-2.5z"
          />
        </svg>
      </div>

      <div class="ai-chatbot-window" *ngIf="isChatbotOpen" [class.maximized]="isChatbotMaximized">
        <div class="chatbot-header">
          <div class="chatbot-title">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="white"
              style="margin-right: 6px; vertical-align: middle;"
            >
              <path
                d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5A2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5a2.5 2.5 0 0 0 2.5 2.5a2.5 2.5 0 0 0 2.5-2.5a2.5 2.5 0 0 0-2.5-2.5z"
              />
            </svg>
            {{ 'ai.bot.title' | i18n }}
          </div>
          <div class="chatbot-controls">
            <span class="control-item" (click)="toggleMaximize()" title="{{ isChatbotMaximized ? '还原' : '最大化' }}">
              <i nz-icon [nzType]="isChatbotMaximized ? 'fullscreen-exit' : 'fullscreen'" nzTheme="outline"></i>
            </span>
            <span class="control-item" (click)="toggleChatbot()" title="关闭">
              <i nz-icon nzType="close" nzTheme="outline"></i>
            </span>
          </div>
        </div>
        <div class="chatbot-messages" #chatMessagesContainer>
          <div
            *ngFor="let message of chatMessages"
            [class.user-message]="message.isUser"
            [class.bot-message]="!message.isUser"
            class="message"
          >
            <div class="message-content">{{ message.content }}</div>
            <div class="message-time">{{ message.timestamp | date : 'HH:mm' }}</div>
          </div>
          <div *ngIf="currentBotMessage && isLoading" class="bot-message streaming-message">
            <div class="message-content">{{ currentBotMessage.content }}</div>
            <div class="message-time">{{ currentBotMessage.timestamp | date : 'HH:mm' }}</div>
          </div>
          <div *ngIf="isLoading && !currentBotMessage" class="bot-message loading-message">
            <nz-spin nzSimple></nz-spin>
          </div>
        </div>
        <div class="chatbot-input">
          <input
            nz-input
            placeholder="{{ 'ai.bot.input.placeholder' | i18n }}"
            [(ngModel)]="currentMessage"
            (keyup.enter)="sendMessage()"
            [disabled]="isLoading"
          />
          <button nz-button nzType="primary" [disabled]="!currentMessage.trim() || isLoading" (click)="sendMessage()">
            {{ 'ai.bot.send' | i18n }}
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./basic.component.less']
})
export class LayoutBasicComponent implements OnInit, OnDestroy {
  options: LayoutDefaultOptions = {
    logoExpanded: `./assets/brand_white.svg`,
    logoCollapsed: `./assets/logo.svg`
  };
  avatar: string = `./assets/img/avatar.svg`;
  searchToggleStatus = false;
  showSettingDrawer = !environment.production;
  version = CONSTANTS.VERSION;
  currentYear = new Date().getFullYear();
  get user(): User {
    return this.settings.user;
  }

  get role(): string {
    let userTmp = this.settings.user;
    if (userTmp == undefined || userTmp.role == undefined) {
      return this.i18nSvc.fanyi('app.role.admin');
    } else {
      let roles: string[] = JSON.parse(userTmp.role);
      return roles.length > 0 ? roles[0] : '';
    }
  }

  // AI Chatbot related properties
  isChatbotOpen = false;
  isChatbotMaximized = false;
  chatMessages: ChatMessage[] = [];
  currentMessage = '';
  isLoading = false;
  currentBotMessage: ChatMessage | null = null;

  // For subscription cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private settings: SettingsService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService,
    private aiBotService: AiBotService
  ) {}

  ngOnInit(): void {
    // Initialize welcome message
    this.chatMessages.push({
      content: this.i18nSvc.fanyi('ai.bot.greeting'),
      isUser: false,
      timestamp: new Date()
    });

    console.log('AI Chatbot initialization completed');
  }

  ngOnDestroy(): void {
    // Cancel all subscriptions when component is destroyed
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleChatbot(): void {
    this.isChatbotOpen = !this.isChatbotOpen;

    if (!this.isChatbotOpen) {
      setTimeout(() => {
        this.isChatbotMaximized = false;
      }, 300);
    } else {
      // Scroll to bottom when window opens
      setTimeout(() => this.scrollToBottom(), 100);
    }

    console.log('Toggle chatbot status:', this.isChatbotOpen ? 'open' : 'closed');
  }

  toggleMaximize(): void {
    setTimeout(() => {
      this.isChatbotMaximized = !this.isChatbotMaximized;
      console.log('Chat window maximize status:', this.isChatbotMaximized ? 'maximized' : 'normal');
    }, 10);
  }

  sendMessage(): void {
    if (!this.currentMessage.trim() || this.isLoading) return;

    // Add user message
    this.chatMessages.push({
      content: this.currentMessage,
      isUser: true,
      timestamp: new Date()
    });

    const userMessage = this.currentMessage;
    this.currentMessage = '';
    this.isLoading = true;
    this.currentBotMessage = null;

    // Ensure scrolling to bottom after message display
    setTimeout(() => this.scrollToBottom(), 100);

    // Call AI service to get response
    this.aiBotService
      .sendMessage(userMessage)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;

          // If there is a current message, add it to chat history
          if (this.currentBotMessage) {
            this.chatMessages.push({ ...this.currentBotMessage });
            this.currentBotMessage = null;
          }

          // Ensure scrolling to bottom after message display
          setTimeout(() => this.scrollToBottom(), 100);
        })
      )
      .subscribe({
        next: response => {
          console.log('Received AI response update:', response);
          // Update currently receiving message
          this.currentBotMessage = response;
          // Scroll to bottom in real-time
          this.scrollToBottom();
        },
        error: error => {
          console.error('AI response error:', error);
          // Add error message
          this.chatMessages.push({
            content: this.i18nSvc.fanyi('ai.bot.connect-fail'),
            isUser: false,
            timestamp: new Date()
          });
        }
      });
  }

  // Scroll to bottom of messages
  private scrollToBottom(): void {
    try {
      const chatMessages = document.querySelector('.chatbot-messages');
      if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    } catch (err) {
      console.error('Failed to scroll to bottom:', err);
    }
  }
}
