import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-summary-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './summary-card.component.html',
  styleUrl: './summary-card.component.less'
})
export class SummaryCardComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value = '';
  @Input() hint?: string;
  @Input() delta?: string;
  @Input() tone: 'primary' | 'success' | 'warning' | 'danger' = 'primary';

  @Output() readonly selected = new EventEmitter<void>();
}
