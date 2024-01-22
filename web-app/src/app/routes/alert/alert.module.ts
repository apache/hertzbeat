import { NgModule, Type } from '@angular/core';
import { SharedModule } from '@shared';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzCascaderModule } from 'ng-zorro-antd/cascader';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTimePickerModule } from 'ng-zorro-antd/time-picker';
import { NzTransferModule } from 'ng-zorro-antd/transfer';
import { NzUploadModule } from 'ng-zorro-antd/upload';

import { AlertCenterComponent } from './alert-center/alert-center.component';
import { AlertConvergeComponent } from './alert-converge/alert-converge.component';
import { AlertNoticeComponent } from './alert-notice/alert-notice.component';
import { AlertRoutingModule } from './alert-routing.module';
import { AlertSettingComponent } from './alert-setting/alert-setting.component';
import { AlertSilenceComponent } from './alert-silence/alert-silence.component';

const COMPONENTS: Array<Type<void>> = [
  AlertCenterComponent,
  AlertSettingComponent,
  AlertNoticeComponent,
  AlertSilenceComponent,
  AlertConvergeComponent
];

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
    NzTimePickerModule,
    NzDatePickerModule,
    NzBadgeModule,
    NzUploadModule
  ],
  declarations: COMPONENTS
})
export class AlertModule {}
