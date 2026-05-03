import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-platform-panel-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './platform-panel-header.component.html',
  styleUrl: './platform-panel-header.component.less'
})
export class PlatformPanelHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() description?: string;
  @Input() compact = false;
}
