import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-platform-stage-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './platform-stage-section.component.html',
  styleUrl: './platform-stage-section.component.less'
})
export class PlatformStageSectionComponent {
  @Input() kicker?: string;
  @Input() title?: string;
  @Input() description?: string;
  @Input() compact = false;
  @Input() tone: 'default' | 'subtle' = 'default';

  get hasHeader(): boolean {
    return !!(this.kicker || this.title || this.description);
  }
}
