import { Component } from '@angular/core';

@Component({
  selector: 'layout-blank',
  template: `<router-outlet></router-outlet> `,
  host: {
    '[class.alain-blank]': 'true'
  }
})
export class LayoutBlankComponent {}
