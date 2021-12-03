import { NgModule, Type } from '@angular/core';
import { SharedModule } from '@shared';
import { MonitorRoutingModule } from './monitor-routing.module';
import {MonitorNewComponent} from "./monitor-new/monitor-new.component";
import {MonitorEditComponent} from "./monitor-edit/monitor-edit.component";
import {MonitorListComponent} from "./monitor-list/monitor-list.component";
import {MonitorDetailComponent} from "./monitor-detail/monitor-detail.component";
import {NzBreadCrumbModule} from "ng-zorro-antd/breadcrumb";
import {NzDividerModule} from "ng-zorro-antd/divider";
import {NzSwitchModule} from "ng-zorro-antd/switch";
import {NzTagModule} from "ng-zorro-antd/tag";

const COMPONENTS: Type<void>[] = [
  MonitorNewComponent,
  MonitorEditComponent,
  MonitorListComponent,
  MonitorDetailComponent
];

@NgModule({
    imports: [
        SharedModule,
        MonitorRoutingModule,
        NzBreadCrumbModule,
        NzDividerModule,
        NzSwitchModule,
        NzTagModule
    ],
  declarations: COMPONENTS,
})
export class MonitorModule { }
