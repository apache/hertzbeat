import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface PlatformKeyValueGridItem {
  label: string;
  value: string;
}

@Component({
  selector: 'app-platform-key-value-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './platform-key-value-grid.component.html',
  styleUrl: './platform-key-value-grid.component.less'
})
export class PlatformKeyValueGridComponent {
  @Input({ required: true }) items: PlatformKeyValueGridItem[] = [];
  @Input() compact = false;
}
