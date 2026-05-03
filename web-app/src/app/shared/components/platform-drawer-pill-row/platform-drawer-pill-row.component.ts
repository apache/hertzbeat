import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface PlatformDrawerPillItem {
  text: string;
  tone?: 'default' | 'success' | 'error';
  actionKey?: string;
  active?: boolean;
}

@Component({
  selector: 'app-platform-drawer-pill-row',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './platform-drawer-pill-row.component.html',
  styleUrl: './platform-drawer-pill-row.component.less'
})
export class PlatformDrawerPillRowComponent {
  @Input({ required: true }) items: PlatformDrawerPillItem[] = [];
  @Output() readonly itemSelected = new EventEmitter<string>();

  onItemSelected(item: PlatformDrawerPillItem): void {
    if (item.actionKey) {
      this.itemSelected.emit(item.actionKey);
    }
  }
}
