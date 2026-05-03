import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { PlatformCopyrightFooterComponent } from '../platform-copyright-footer/platform-copyright-footer.component';

export interface PageShellAction {
  key: string;
  label: string;
  tone?: 'primary' | 'default' | 'danger';
}

export type PageShellFooterMode = 'shell' | 'content' | 'none';

@Component({
  selector: 'app-page-shell',
  standalone: true,
  imports: [CommonModule, NzButtonModule, PlatformCopyrightFooterComponent],
  templateUrl: './page-shell.component.html',
  styleUrl: './page-shell.component.less'
})
export class PageShellComponent {
  @Input() kicker?: string;
  @Input({ required: true }) title = '';
  @Input() subtitle?: string;
  @Input() hideHeader = false;
  @Input() showAside = false;
  @Input() showFooter = true;
  @Input() footerMode: PageShellFooterMode = 'shell';
  @Input() actions: PageShellAction[] = [];

  @Output() readonly actionSelected = new EventEmitter<string>();

  onActionSelect(key: string): void {
    this.actionSelected.emit(key);
  }

  get useShellFooter(): boolean {
    return this.showFooter && this.footerMode === 'shell';
  }

  get useContentFooter(): boolean {
    return this.showFooter && this.footerMode === 'content';
  }
}
