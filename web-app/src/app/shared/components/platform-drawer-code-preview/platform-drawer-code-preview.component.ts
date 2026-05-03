import { Component, Input } from '@angular/core';

type CodePreviewVariant = 'minimal' | 'editor-card' | 'inline-token';

@Component({
  selector: 'app-platform-drawer-code-preview',
  standalone: false,
  templateUrl: './platform-drawer-code-preview.component.html',
  styleUrls: ['./platform-drawer-code-preview.component.less']
})
export class PlatformDrawerCodePreviewComponent {
  @Input({ required: true }) code = '';
  @Input() language = 'text';
  @Input() title = '';
  @Input() maxHeight = 'calc(100vh - 280px)';
  @Input() variant: CodePreviewVariant = 'editor-card';
}
