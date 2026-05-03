import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NzTagModule } from 'ng-zorro-antd/tag';

export interface PlatformDrawerFactItem {
  label: string;
  value: string;
  monospace?: boolean;
  tagColor?: string;
}

@Component({
  selector: 'app-platform-drawer-facts',
  standalone: true,
  imports: [CommonModule, NzTagModule],
  templateUrl: './platform-drawer-facts.component.html',
  styleUrl: './platform-drawer-facts.component.less'
})
export class PlatformDrawerFactsComponent {
  @Input({ required: true }) items: PlatformDrawerFactItem[] = [];
}
