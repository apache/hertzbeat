import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

export interface PlatformDrawerActionLinkItem {
  key: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-platform-drawer-action-links',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule],
  templateUrl: './platform-drawer-action-links.component.html',
  styleUrl: './platform-drawer-action-links.component.less'
})
export class PlatformDrawerActionLinksComponent {
  @Input({ required: true }) items: PlatformDrawerActionLinkItem[] = [];
  @Output() actionSelected = new EventEmitter<string>();

  onSelect(key: string): void {
    this.actionSelected.emit(key);
  }
}
