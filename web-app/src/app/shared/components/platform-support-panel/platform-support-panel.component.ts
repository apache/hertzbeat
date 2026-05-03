import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-platform-support-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './platform-support-panel.component.html',
  styleUrl: './platform-support-panel.component.less'
})
export class PlatformSupportPanelComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle?: string;
  @Input() actionLabel = '';
  @Input() expanded = false;
}
