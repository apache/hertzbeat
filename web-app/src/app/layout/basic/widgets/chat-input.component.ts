import { Component, Input, Output, EventEmitter, Inject } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';

import { AiChatModalService } from '../../../shared/services/ai-chat-modal.service';

@Component({
  selector: 'header-ai-chat',
  template: `
    <div class="ai-chat-input-container">
      <nz-input-group [nzSuffix]="iconTpl" nzCompact class="ai-chat-input-group">
        <ng-template #iconTpl>
          <i nz-icon [hidden]="inputMessage.trim()" [nzType]="'message'"></i>
          <i nz-icon (click)="onSubmit()" [hidden]="!inputMessage.trim()" [nzType]="'send'"></i>
        </ng-template>
        <input
          nz-input
          type="text"
          class="ai-chat-input"
          [(ngModel)]="inputMessage"
          [placeholder]="'ai.chat.input.placeholder' | i18n"
          (keydown.enter)="onSubmit()"
          (focus)="onFocus()"
          (blur)="onBlur()"
        />
      </nz-input-group>
    </div>
  `,
  styles: [
    `
      .ai-chat-input-container {
        display: flex;
        align-items: center;
        width: 100%;
        max-width: 500px;
      }

      .ai-chat-input-group {
        width: 100%;
        display: flex;
      }

      .ai-chat-input {
        flex: 1;
        min-width: 300px;
        border-radius: 8px;
        border-right: none !important;
      }

      .ai-chat-input:focus {
        box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
        border-color: #1890ff;
      }

      [data-theme='dark'] .ai-chat-input {
        background-color: #141414;
        border-color: #434343;
        color: #fff;
      }

      [data-theme='dark'] .ai-chat-input::placeholder {
        color: #8c8c8c;
      }
    `
  ]
})
export class HeaderAiChatComponent {
  @Input() disabled = false;
  @Output() readonly search = new EventEmitter<string>();

  inputMessage = '';

  constructor(private aiChatModalService: AiChatModalService, @Inject(ALAIN_I18N_TOKEN) private i18n: I18NService) {}

  onSubmit(): void {
    if (this.inputMessage.trim()) {
      this.aiChatModalService.openChatModal(this.inputMessage.trim());
      this.inputMessage = '';
    }
  }

  onFocus(): void {
    // 可以添加聚焦时的逻辑
  }

  onBlur(): void {
    // 可以添加失焦时的逻辑
  }
}
