import { NgModule, Type } from '@angular/core';
import { SharedModule } from '@shared';

// dashboard pages
import { NgxEchartsModule } from 'ngx-echarts';

import { DashboardComponent } from './dashboard/dashboard.component';
// single pages
import { UserLockComponent } from './passport/lock/lock.component';
// passport pages
import { UserLoginComponent } from './passport/login/login.component';
import { RouteRoutingModule } from './routes-routing.module';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';

const COMPONENTS: Array<Type<void>> = [
  DashboardComponent,
  // passport pages
  UserLoginComponent,
  // single pages
  UserLockComponent
];

@NgModule({
  imports: [SharedModule, RouteRoutingModule, NgxEchartsModule, NzTagModule, NzTimelineModule],
  declarations: COMPONENTS
})
export class RoutesModule {}
