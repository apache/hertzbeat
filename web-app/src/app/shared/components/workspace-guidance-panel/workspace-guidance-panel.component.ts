import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Inject, Input, Output } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { PlatformFactsStripItem } from '../platform-facts-strip/platform-facts-strip.component';
import { PlatformFactsStripComponent } from '../platform-facts-strip/platform-facts-strip.component';
import { PlatformSupportLinkListComponent, PlatformSupportLinkItem } from '../platform-support-link-list/platform-support-link-list.component';
import { PlatformSupportPanelComponent } from '../platform-support-panel/platform-support-panel.component';

export interface WorkspaceGuidanceAction {
  key: string;
  label: string;
  tone?: 'primary' | 'default';
  disabled?: boolean;
}

export interface WorkspaceGuidanceReason {
  label: string;
  value: string;
}

export interface WorkspaceGuidanceLink {
  key: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

@Component({
  standalone: true,
  selector: 'app-workspace-guidance-panel',
  imports: [CommonModule, NzButtonModule, PlatformSupportPanelComponent, PlatformFactsStripComponent, PlatformSupportLinkListComponent],
  templateUrl: './workspace-guidance-panel.component.html',
  styleUrls: ['./workspace-guidance-panel.component.less']
})
export class WorkspaceGuidancePanelComponent {
  @Input() headline = '';
  @Input() description = '';
  @Input() primaryAction?: WorkspaceGuidanceAction;
  @Input() secondaryAction?: WorkspaceGuidanceAction;
  @Input() reasons: WorkspaceGuidanceReason[] = [];
  @Input() nextLinks: WorkspaceGuidanceLink[] = [];

  @Output() readonly actionSelected = new EventEmitter<string>();
  @Output() readonly nextSelected = new EventEmitter<string>();

  constructor(@Inject(ALAIN_I18N_TOKEN) private readonly i18nSvc: I18NService) {}

  get startLabel(): string {
    return this.i18nSvc.fanyi('workspace.guidance.start');
  }

  get reasonsLabel(): string {
    return this.i18nSvc.fanyi('workspace.guidance.reasons');
  }

  get nextLabel(): string {
    return this.i18nSvc.fanyi('workspace.guidance.next');
  }

  get reasonFacts(): PlatformFactsStripItem[] {
    return this.reasons.map(reason => ({
      label: reason.label,
      value: reason.value
    }));
  }

  get nextLinkItems(): PlatformSupportLinkItem[] {
    return this.nextLinks.map(link => ({
      key: link.key,
      label: link.label,
      ...(link.description != null ? { description: link.description } : {}),
      ...(link.disabled != null ? { disabled: link.disabled } : {})
    }));
  }

  runAction(action?: WorkspaceGuidanceAction): void {
    if (action == null || action.disabled) {
      return;
    }
    this.actionSelected.emit(action.key);
  }

  runNext(link: WorkspaceGuidanceLink): void {
    if (!link.disabled) {
      this.nextSelected.emit(link.key);
    }
  }
}
