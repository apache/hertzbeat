import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ExceptionModule as DelonExceptionModule } from '@delon/abc/exception';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';

import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { ExceptionRoutingModule } from './exception-routing.module';
import { ExceptionComponent } from './exception.component';

@NgModule({
  imports: [CommonModule, DelonExceptionModule, NzButtonModule, NzCardModule, ExceptionRoutingModule, PageShellComponent],
  declarations: [ExceptionComponent]
})
export class ExceptionModule {}
