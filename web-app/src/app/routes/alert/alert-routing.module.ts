import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AlertCenterComponent } from './alert-center/alert-center.component';
import { AlertNoticeComponent } from './alert-notice/alert-notice.component';
import { AlertSettingComponent } from './alert-setting/alert-setting.component';

const routes: Routes = [
  { path: '', component: AlertCenterComponent },
  { path: 'center', component: AlertCenterComponent },
  { path: 'setting', component: AlertSettingComponent },
  { path: 'notice', component: AlertNoticeComponent },
  { path: '**', component: AlertCenterComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AlertRoutingModule {}
