import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

export interface PlatformSummaryMetricGridItem {
  label: string;
  value: string;
  icon?: string;
  tone?: 'default' | 'accent' | 'critical' | 'warning' | 'success';
  actionLabel?: string;
  actionKey?: string;
}

@Component({
  selector: 'app-platform-summary-metric-grid',
  standalone: true,
  imports: [CommonModule, NzIconModule, NzButtonModule],
  templateUrl: './platform-summary-metric-grid.component.html',
  styleUrl: './platform-summary-metric-grid.component.less'
})
export class PlatformSummaryMetricGridComponent {
  @Input({ required: true }) items: PlatformSummaryMetricGridItem[] = [];
  @Output() readonly itemActionSelected = new EventEmitter<string>();

  onActionSelected(item: PlatformSummaryMetricGridItem): void {
    if (item.actionKey == null) {
      return;
    }
    this.itemActionSelected.emit(item.actionKey);
  }
}
