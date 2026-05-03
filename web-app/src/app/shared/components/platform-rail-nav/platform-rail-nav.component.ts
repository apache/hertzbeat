import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';

export interface PlatformRailNavItem {
  key: string;
  label: string;
  icon: string;
  count?: number | string;
  tooltip?: string;
  active?: boolean;
  static?: boolean;
}

export interface PlatformRailNavGroup {
  key: string;
  title: string;
  hintTitle?: string;
  hintMeta?: string;
  items: PlatformRailNavItem[];
}

@Component({
  selector: 'app-platform-rail-nav',
  standalone: true,
  imports: [CommonModule, NzIconModule],
  templateUrl: './platform-rail-nav.component.html',
  styleUrl: './platform-rail-nav.component.less',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'platform-rail-nav-host'
  }
})
export class PlatformRailNavComponent {
  @Input() groups: PlatformRailNavGroup[] = [];

  @Output() itemSelected = new EventEmitter<PlatformRailNavItem>();

  trackByGroup(_index: number, group: PlatformRailNavGroup): string {
    return group.key;
  }

  trackByItem(_index: number, item: PlatformRailNavItem): string {
    return item.key;
  }

  handleItemClick(item: PlatformRailNavItem): void {
    if (item.static) {
      return;
    }
    this.itemSelected.emit(item);
  }
}
