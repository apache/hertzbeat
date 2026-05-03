import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ExceptionType } from '@delon/abc/exception';

@Component({
  standalone: false,
  selector: 'app-exception',
  template: `
    <app-page-shell title="Exception" [hideHeader]="true">
      <div pageContent class="exception-page-shell">
        <exception [type]="type" style="min-height: 500px; height: 80%;"> </exception>
      </div>
    </app-page-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExceptionComponent {
  get type(): ExceptionType {
    return this.route.snapshot.data.type;
  }

  constructor(private route: ActivatedRoute) {}
}
