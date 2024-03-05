import { NgModule, Type } from '@angular/core';
// eslint-disable-next-line import/order
import { SharedModule } from '@shared';

// dashboard pages
import { TagCloudComponent } from 'angular-tag-cloud-module';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { NgxEchartsModule } from 'ngx-echarts';
import { SlickCarouselModule } from 'ngx-slick-carousel';

import { LayoutModule } from '../layout/layout.module';
import { DashboardComponent } from './dashboard/dashboard.component';
// single pages
import { UserLockComponent } from './passport/lock/lock.component';
// passport pages
import { UserLoginComponent } from './passport/login/login.component';
import { RouteRoutingModule } from './routes-routing.module';
import { StatusPublicComponent } from './status-public/status-public.component';

const COMPONENTS: Array<Type<void>> = [
  DashboardComponent,
  // passport pages
  UserLoginComponent,
  // single pages
  UserLockComponent,
  // status pages
  StatusPublicComponent
];

@NgModule({
  imports: [
    SharedModule,
    RouteRoutingModule,
    NgxEchartsModule,
    NzTagModule,
    NzTimelineModule,
    SlickCarouselModule,
    TagCloudComponent,
    NzDividerModule,
    LayoutModule,
    NzCollapseModule,
    NzListModule
  ],
  declarations: COMPONENTS
})
export class RoutesModule {}
