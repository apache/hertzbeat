import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-platform-drawer-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './platform-drawer-section.component.html',
  styleUrl: './platform-drawer-section.component.less'
})
export class PlatformDrawerSectionComponent {
  @Input({ required: true }) title = '';
}
