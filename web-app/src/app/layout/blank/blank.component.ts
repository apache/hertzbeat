import { Component } from '@angular/core';

@Component({
  standalone: false,  selector: 'layout-blank',
  template: `<router-outlet></router-outlet> `,
  host: {
    '[class.alain-blank]': 'true'
  }
})
export class LayoutBlankComponent {}
