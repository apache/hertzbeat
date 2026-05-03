import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface PlatformStageInsightItem {
  label: string;
  value: string;
}

@Component({
  selector: 'app-platform-stage-insight-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './platform-stage-insight-list.component.html',
  styleUrl: './platform-stage-insight-list.component.less'
})
export class PlatformStageInsightListComponent {
  @Input({ required: true }) items: PlatformStageInsightItem[] = [];
}
