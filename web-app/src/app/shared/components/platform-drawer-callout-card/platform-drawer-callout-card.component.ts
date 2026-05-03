import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-platform-drawer-callout-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './platform-drawer-callout-card.component.html',
  styleUrl: './platform-drawer-callout-card.component.less'
})
export class PlatformDrawerCalloutCardComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle?: string;
  @Input() body?: string;
  @Input() detail?: string;
  @Input() contextTags: string[] = [];
  @Input() empty = false;
}
