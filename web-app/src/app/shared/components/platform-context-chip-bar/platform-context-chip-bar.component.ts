import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface PlatformContextChipItem {
  label: string;
  value: string;
}

@Component({
  selector: 'app-platform-context-chip-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './platform-context-chip-bar.component.html',
  styleUrl: './platform-context-chip-bar.component.less'
})
export class PlatformContextChipBarComponent {
  @Input({ required: true }) items: PlatformContextChipItem[] = [];
  @Input() variant: 'inline' | 'header' = 'inline';
  @Input() dense = false;
}
