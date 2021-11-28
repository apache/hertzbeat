import { NgModule, Type } from '@angular/core';
import { SharedModule } from '@shared';
import { MonitorRoutingModule } from './monitor-routing.module';

const COMPONENTS: Type<void>[] = [];

@NgModule({
  imports: [
    SharedModule,
    MonitorRoutingModule
  ],
  declarations: COMPONENTS,
})
export class MonitorModule { }
