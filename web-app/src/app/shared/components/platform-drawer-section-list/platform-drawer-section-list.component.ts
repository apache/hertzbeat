import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';

import {
  PlatformDrawerAttributeItem,
  PlatformDrawerAttributeListComponent
} from '../platform-drawer-attribute-list/platform-drawer-attribute-list.component';

export interface PlatformDrawerSectionListItem {
  title: string;
  meta?: string;
  secondaryMeta?: string[];
  attributeItems?: PlatformDrawerAttributeItem[];
  actionLabel?: string;
  actionKey?: string;
}

@Component({
  selector: 'app-platform-drawer-section-list',
  standalone: true,
  imports: [CommonModule, NzButtonModule, PlatformDrawerAttributeListComponent],
  templateUrl: './platform-drawer-section-list.component.html',
  styleUrl: './platform-drawer-section-list.component.less'
})
export class PlatformDrawerSectionListComponent {
  @Input({ required: true }) items: PlatformDrawerSectionListItem[] = [];
  @Input() emptyCopy = '-';
  @Output() readonly itemActionSelected = new EventEmitter<string>();

  onActionSelected(item: PlatformDrawerSectionListItem): void {
    if (!item.actionKey) {
      return;
    }
    this.itemActionSelected.emit(item.actionKey);
  }
}
