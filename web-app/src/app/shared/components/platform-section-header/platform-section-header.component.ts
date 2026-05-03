import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-platform-section-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './platform-section-header.component.html',
  styleUrl: './platform-section-header.component.less'
})
export class PlatformSectionHeaderComponent {
  @Input() kicker?: string;
  @Input({ required: true }) title = '';
  @Input() description?: string;
  @Input() compact = false;
}
