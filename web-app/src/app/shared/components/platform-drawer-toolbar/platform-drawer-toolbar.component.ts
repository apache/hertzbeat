import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface PlatformDrawerToolbarMetaItem {
  text: string;
  monospace?: boolean;
}

@Component({
  selector: 'app-platform-drawer-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './platform-drawer-toolbar.component.html',
  styleUrl: './platform-drawer-toolbar.component.less'
})
export class PlatformDrawerToolbarComponent {
  @Input() badges: string[] = [];
  @Input() meta: PlatformDrawerToolbarMetaItem[] = [];
}
