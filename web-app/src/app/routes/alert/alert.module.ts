import { NgModule, Type } from '@angular/core';
import { SharedModule } from '@shared';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzCascaderModule } from 'ng-zorro-antd/cascader';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTimePickerModule } from 'ng-zorro-antd/time-picker';
import { NzTransferModule } from 'ng-zorro-antd/transfer';

import { AlertCenterComponent } from './alert-center/alert-center.component';
import { AlertNoticeComponent } from './alert-notice/alert-notice.component';
import { AlertRoutingModule } from './alert-routing.module';
import { AlertSettingComponent } from './alert-setting/alert-setting.component';

const COMPONENTS: Array<Type<void>> = [AlertCenterComponent, AlertSettingComponent, AlertNoticeComponent];

@NgModule({
  imports: [
    SharedModule,
    AlertRoutingModule,
    NzDividerModule,
    NzBreadCrumbModule,
    NzTagModule,
    NzRadioModule,
    NzSwitchModule,
    NzCascaderModule,
    NzTransferModule,
    NzCollapseModule,
    NzListModule,
    NzTimePickerModule
  ],
  declarations: COMPONENTS
})
export class AlertModule {}
