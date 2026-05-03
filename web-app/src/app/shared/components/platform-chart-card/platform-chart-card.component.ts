import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { PlatformStageMetaChipItem, PlatformStageMetaHeaderComponent } from '../platform-stage-meta-header/platform-stage-meta-header.component';

@Component({
  selector: 'app-platform-chart-card',
  standalone: true,
  imports: [CommonModule, PlatformStageMetaHeaderComponent],
  templateUrl: './platform-chart-card.component.html',
  styleUrl: './platform-chart-card.component.less'
})
export class PlatformChartCardComponent {
  @Input({ required: true }) title = '';
  @Input() description?: string;
  @Input() metaItems: PlatformStageMetaChipItem[] = [];
}
