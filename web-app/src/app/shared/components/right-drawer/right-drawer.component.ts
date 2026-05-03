import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Inject, Input, Output } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { DrawerPayload } from '../../../core/ops-workspace/ops-workspace.types';

@Component({
  selector: 'app-right-drawer',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzDividerModule, NzTagModule],
  templateUrl: './right-drawer.component.html',
  styleUrl: './right-drawer.component.less'
})
export class RightDrawerComponent {
  @Input() payload: DrawerPayload | null = null;
  @Input() visible = false;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly actionTriggered = new EventEmitter<string>();

  constructor(@Inject(ALAIN_I18N_TOKEN) private readonly i18nSvc: I18NService) {}

  close(): void {
    this.closed.emit();
  }

  triggerAction(actionKey: string): void {
    this.actionTriggered.emit(actionKey);
  }

  getStatusLabel(status: string): string {
    const translationKey = this.getStatusTranslationKey(status);
    if (!translationKey) {
      return status;
    }
    const translated = this.i18nSvc.fanyi(translationKey);
    return translated === translationKey ? status : translated;
  }

  private getStatusTranslationKey(status: string): string | null {
    switch (status) {
      case 'firing':
      case 'acknowledged':
      case 'resolved':
        return `alert.status.${status}`;
      case 'critical':
      case 'warning':
      case 'healthy':
      case 'error':
      case 'info':
      case 'unknown':
        return `dashboard.severity.${status}`;
      case 'degraded':
        return 'entity.status.degraded';
      case 'impacted':
        return 'right.drawer.status.impacted';
      case 'success':
        return 'right.drawer.status.success';
      default:
        return null;
    }
  }
}
