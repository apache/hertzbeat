import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface PlatformFactsStripItem {
  label: string;
  value: string;
  tone?: 'default' | 'critical' | 'warning' | 'success' | 'accent';
}

@Component({
  selector: 'app-platform-facts-strip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './platform-facts-strip.component.html',
  styleUrl: './platform-facts-strip.component.less'
})
export class PlatformFactsStripComponent {
  @Input({ required: true }) items: PlatformFactsStripItem[] = [];
  @Input() dense = false;
}
