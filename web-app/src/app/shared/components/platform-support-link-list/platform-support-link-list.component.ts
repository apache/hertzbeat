import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';

export interface PlatformSupportLinkItem {
  key: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-platform-support-link-list',
  standalone: true,
  imports: [CommonModule, NzButtonModule],
  templateUrl: './platform-support-link-list.component.html',
  styleUrl: './platform-support-link-list.component.less'
})
export class PlatformSupportLinkListComponent {
  @Input({ required: true }) items: PlatformSupportLinkItem[] = [];
  @Output() readonly itemSelected = new EventEmitter<string>();

  selectItem(item: PlatformSupportLinkItem): void {
    if (item.disabled) {
      return;
    }
    this.itemSelected.emit(item.key);
  }
}
