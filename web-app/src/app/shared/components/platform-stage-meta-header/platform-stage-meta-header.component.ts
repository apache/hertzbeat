import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface PlatformStageMetaChipItem {
  text: string;
  tone?: 'default' | 'accent' | 'critical' | 'success';
  monospace?: boolean;
}

@Component({
  selector: 'app-platform-stage-meta-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './platform-stage-meta-header.component.html',
  styleUrl: './platform-stage-meta-header.component.less'
})
export class PlatformStageMetaHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() description?: string;
  @Input() compact = false;
  @Input() metaItems: PlatformStageMetaChipItem[] = [];
}
