import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AlertCenterComponent } from './alert-center/alert-center.component';
import { AlertConvergeComponent } from './alert-converge/alert-converge.component';
import { AlertNoticeComponent } from './alert-notice/alert-notice.component';
import { AlertSettingComponent } from './alert-setting/alert-setting.component';
import { AlertSilenceComponent } from './alert-silence/alert-silence.component';

const routes: Routes = [
  { path: '', component: AlertCenterComponent },
  { path: 'center', component: AlertCenterComponent },
  { path: 'setting', component: AlertSettingComponent },
  { path: 'notice', component: AlertNoticeComponent },
  { path: 'silence', component: AlertSilenceComponent },
  { path: 'converge', component: AlertConvergeComponent },
  { path: '**', component: AlertCenterComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AlertRoutingModule {}
