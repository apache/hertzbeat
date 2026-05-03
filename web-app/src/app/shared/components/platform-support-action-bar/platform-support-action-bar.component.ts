import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';

export interface PlatformSupportActionItem {
  key: string;
  label: string;
  disabled?: boolean;
  tone?: 'primary' | 'default';
}

@Component({
  selector: 'app-platform-support-action-bar',
  standalone: true,
  imports: [CommonModule, NzButtonModule],
  templateUrl: './platform-support-action-bar.component.html',
  styleUrl: './platform-support-action-bar.component.less'
})
export class PlatformSupportActionBarComponent {
  @Input({ required: true }) items: PlatformSupportActionItem[] = [];
  @Output() readonly itemSelected = new EventEmitter<string>();

  onItemClick(item: PlatformSupportActionItem): void {
    if (!item.disabled) {
      this.itemSelected.emit(item.key);
    }
  }
}
