import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ExceptionType } from '@delon/abc/exception';

@Component({
  selector: 'app-exception',
  template: ` <exception [type]="type" style="min-height: 500px; height: 80%;"> </exception> `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExceptionComponent {
  get type(): ExceptionType {
    return this.route.snapshot.data.type;
  }

  constructor(private route: ActivatedRoute) {}
}
