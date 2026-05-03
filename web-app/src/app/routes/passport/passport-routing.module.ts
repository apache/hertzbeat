import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LayoutPassportComponent } from '../../layout/passport/passport.component';
import { UserLockComponent } from './lock/lock.component';
import { UserLoginComponent } from './login/login.component';

const routes: Routes = [
  {
    path: '',
    component: LayoutPassportComponent,
    children: [
      { path: 'login', component: UserLoginComponent, data: { titleI18n: 'app.login.login' } },
      { path: 'lock', component: UserLockComponent, data: { titleI18n: 'app.lock' } }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PassportRoutingModule {}
