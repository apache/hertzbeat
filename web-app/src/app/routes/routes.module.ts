import { NgModule, Type } from '@angular/core';
// eslint-disable-next-line import/order
import { SharedModule } from '@shared';

import { TagCloudComponent } from 'angular-tag-cloud-module';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { NgxEchartsModule } from 'ngx-echarts';
import { SlickCarouselModule } from 'ngx-slick-carousel';

import { LayoutModule } from '../layout/layout.module';
import { BulletinComponent } from './bulletin/bulletin.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { UserLockComponent } from './passport/lock/lock.component';
import { UserLoginComponent } from './passport/login/login.component';
import { RouteRoutingModule } from './routes-routing.module';
import { StatusPublicComponent } from './status-public/status-public.component';
import {CommonModule} from "@angular/common";
import {NzRadioModule} from "ng-zorro-antd/radio";
import {NzUploadModule} from "ng-zorro-antd/upload";
import {NzCascaderModule} from "ng-zorro-antd/cascader";
import {NzTransferModule} from "ng-zorro-antd/transfer";
import {NzSwitchComponent} from "ng-zorro-antd/switch";
import {NzTreeComponent} from "ng-zorro-antd/tree";

const COMPONENTS: Array<Type<void>> = [DashboardComponent, UserLoginComponent, UserLockComponent, StatusPublicComponent, BulletinComponent];

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
        NzListModule,
        CommonModule,
        NzRadioModule,
        NzUploadModule,
        NzCascaderModule,
        NzTransferModule,
        NzSwitchComponent,
        NzTreeComponent
    ],
  declarations: COMPONENTS
})
export class RoutesModule {}
