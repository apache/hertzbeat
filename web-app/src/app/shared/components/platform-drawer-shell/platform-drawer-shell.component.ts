import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-platform-drawer-shell',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule],
  templateUrl: './platform-drawer-shell.component.html',
  styleUrl: './platform-drawer-shell.component.less'
})
export class PlatformDrawerShellComponent {
  @Input() kicker?: string;
  @Input({ required: true }) title = '';
  @Input() subtitle?: string;
  @Input() showSummary = false;
  @Input() showToolbar = false;
  @Input() contentFlush = false;
  @Input() fullscreen = false;

  @Output() readonly closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }
}
