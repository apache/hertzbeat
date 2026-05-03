import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CONSTANTS } from '../../constants';

@Component({
  selector: 'app-platform-copyright-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './platform-copyright-footer.component.html',
  styleUrl: './platform-copyright-footer.component.less'
})
export class PlatformCopyrightFooterComponent {
  @Input() version = CONSTANTS.VERSION;

  readonly currentYear = new Date().getFullYear();
}
