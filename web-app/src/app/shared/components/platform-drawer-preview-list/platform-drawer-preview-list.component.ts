import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface PlatformDrawerPreviewItem {
  label: string;
  value: string;
}

@Component({
  selector: 'app-platform-drawer-preview-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './platform-drawer-preview-list.component.html',
  styleUrl: './platform-drawer-preview-list.component.less'
})
export class PlatformDrawerPreviewListComponent {
  @Input({ required: true }) items: PlatformDrawerPreviewItem[] = [];
}
