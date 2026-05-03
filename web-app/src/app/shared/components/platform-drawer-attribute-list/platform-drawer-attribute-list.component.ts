import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface PlatformDrawerAttributeItem {
  key: string;
  value: string;
}

@Component({
  selector: 'app-platform-drawer-attribute-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './platform-drawer-attribute-list.component.html',
  styleUrl: './platform-drawer-attribute-list.component.less'
})
export class PlatformDrawerAttributeListComponent {
  @Input({ required: true }) items: PlatformDrawerAttributeItem[] = [];
  @Input() variant: 'preview' | 'detail' = 'preview';
}
