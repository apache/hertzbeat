import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-platform-column-header-row',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './platform-column-header-row.component.html',
  styleUrl: './platform-column-header-row.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlatformColumnHeaderRowComponent {
  @Input({ required: true }) items: string[] = [];
}
