import { NgModule, Type } from '@angular/core';
// eslint-disable-next-line import/order
import { SharedModule } from '@shared';

// dashboard pages
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { NgxEchartsModule } from 'ngx-echarts';

import { DashboardComponent } from './dashboard/dashboard.component';
// single pages
import { UserLockComponent } from './passport/lock/lock.component';
// passport pages
import { UserLoginComponent } from './passport/login/login.component';
import { RouteRoutingModule } from './routes-routing.module';

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
