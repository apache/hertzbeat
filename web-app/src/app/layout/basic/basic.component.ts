import { Component, Inject, OnInit } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN, SettingsService, User } from '@delon/theme';
import { LayoutDefaultOptions } from '@delon/theme/layout-default';
import { environment } from '@env/environment';
import { Observable, of } from 'rxjs';
import { delay, tap } from 'rxjs/operators';

import { CONSTANTS } from '../../shared/constants';

// 聊天消息接口
interface ChatMessage {
  content: string;
  isUser: boolean;
  timestamp: Date;
}

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
    <global-footer style="border-top: 1px solid #e5e5e5; min-height: 120px; margin:0;">
      <div style="margin-top: 30px">
        Apache HertzBeat (incubating) {{ version }}<br />
        Copyright &copy; {{ currentYear }}
        <a href="https://hertzbeat.apache.org" target="_blank">Apache HertzBeat</a>
        <br />
        Licensed under the Apache License, Version 2.0
      </div>
    </global-footer>
    <setting-drawer *ngIf="showSettingDrawer"></setting-drawer>

    <!-- AI聊天机器人 -->
    <div class="ai-chatbot-container">
      <div class="ai-chatbot-button" (click)="toggleChatbot()">
        <span *ngIf="!isChatbotOpen">AI</span>
        <span *ngIf="isChatbotOpen">X</span>
      </div>

      <div class="ai-chatbot-window" *ngIf="isChatbotOpen">
        <div class="chatbot-header">
          <div class="chatbot-title">AI 助手</div>
          <div class="chatbot-close" (click)="toggleChatbot()">X</div>
        </div>
        <div class="chatbot-messages">
          <div *ngFor="let message of chatMessages" 
              [class.user-message]="message.isUser" 
              [class.bot-message]="!message.isUser"
              class="message">
            <div class="message-content">{{message.content}}</div>
            <div class="message-time">{{message.timestamp | date:'HH:mm'}}</div>
          </div>
          <div *ngIf="isLoading" class="bot-message loading-message">
            <nz-spin nzSimple></nz-spin>
          </div>
        </div>
        <div class="chatbot-input">
          <input 
            nz-input 
            placeholder="请输入问题..." 
            [(ngModel)]="currentMessage"
            (keyup.enter)="sendMessage()"
          />
          <button nz-button nzType="primary" [disabled]="!currentMessage.trim()" (click)="sendMessage()">
            发送
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./basic.component.less']
})
export class LayoutBasicComponent implements OnInit {
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

  // AI聊天机器人相关属性
  isChatbotOpen = false;
  chatMessages: ChatMessage[] = [];
  currentMessage = '';
  isLoading = false;

  constructor(private settings: SettingsService, @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService) {}

  ngOnInit(): void {
    // 初始化欢迎消息
    this.chatMessages.push({
      content: '你好！我是AI助手，有什么可以帮助你的吗？',
      isUser: false,
      timestamp: new Date()
    });
    
    console.log('AI聊天机器人初始化完成');
  }

  toggleChatbot(): void {
    this.isChatbotOpen = !this.isChatbotOpen;
    console.log('切换聊天机器人状态:', this.isChatbotOpen ? '打开' : '关闭');
  }

  sendMessage(): void {
    if (!this.currentMessage.trim()) return;
    
    // 添加用户消息
    this.chatMessages.push({
      content: this.currentMessage,
      isUser: true,
      timestamp: new Date()
    });
    
    const userMessage = this.currentMessage;
    this.currentMessage = '';
    this.isLoading = true;
    
    // 模拟AI响应
    this.getAIResponse(userMessage).subscribe(response => {
      this.chatMessages.push(response);
      this.isLoading = false;
    });
  }

  // 模拟AI响应
  private getAIResponse(message: string): Observable<ChatMessage> {
    console.log('发送消息:', message);
    
    return of({
      content: `收到你的问题："${message}"。我是AI助手，很高兴为您服务！`,
      isUser: false,
      timestamp: new Date()
    }).pipe(
      delay(1000),
      tap(response => console.log('AI响应:', response.content))
    );
  }
}
