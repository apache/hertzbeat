import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NzTagModule } from 'ng-zorro-antd/tag';

export interface ActivityTimelineItem {
  title: string;
  detail?: string;
  timestamp?: string;
  tone?: 'info' | 'success' | 'warning' | 'danger';
  tag?: string;
}

@Component({
  selector: 'app-activity-timeline',
  standalone: true,
  imports: [CommonModule, NzTagModule],
  templateUrl: './activity-timeline.component.html',
  styleUrl: './activity-timeline.component.less'
})
export class ActivityTimelineComponent {
  @Input() title = 'Recent Activity';
  @Input() items: ActivityTimelineItem[] = [];
  @Input() emptyText = 'No recent signals in the current context.';
}
