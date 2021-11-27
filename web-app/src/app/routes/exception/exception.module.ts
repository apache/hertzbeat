import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ExceptionModule as DelonExceptionModule } from '@delon/abc/exception';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';

import { ExceptionRoutingModule } from './exception-routing.module';
import { ExceptionComponent } from './exception.component';
import { ExceptionTriggerComponent } from './trigger.component';

@NgModule({
  imports: [CommonModule, DelonExceptionModule, NzButtonModule, NzCardModule, ExceptionRoutingModule],
  declarations: [ExceptionComponent, ExceptionTriggerComponent]
})
export class ExceptionModule {}
