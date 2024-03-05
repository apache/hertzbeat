import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { environment } from '@env/environment';

// layout
import { DetectAuthGuard } from '../core/guard/detect-auth-guard';
import { LayoutBasicComponent } from '../layout/basic/basic.component';
import { LayoutBlankComponent } from '../layout/blank/blank.component';
import { LayoutPassportComponent } from '../layout/passport/passport.component';
// dashboard pages
import { DashboardComponent } from './dashboard/dashboard.component';
// single pages
import { UserLockComponent } from './passport/lock/lock.component';
// passport pages
import { UserLoginComponent } from './passport/login/login.component';
import { StatusPublicComponent } from './status-public/status-public.component';

const routes: Routes = [
  {
    path: '',
    component: LayoutBasicComponent,
    // 路由守卫 在路由之前判断是否有认证或者权限进入此路由
    canActivate: [DetectAuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent, data: { titleI18n: 'menu.dashboard' } },
      { path: 'exception', loadChildren: () => import('./exception/exception.module').then(m => m.ExceptionModule) },
      { path: 'monitors', loadChildren: () => import('./monitor/monitor.module').then(m => m.MonitorModule) },
      { path: 'alert', loadChildren: () => import('./alert/alert.module').then(m => m.AlertModule) },
      { path: 'setting', loadChildren: () => import('./setting/setting.module').then(m => m.SettingModule) }
    ]
  },
  {
    path: 'status',
    component: LayoutBlankComponent,
    children: [{ path: '', component: StatusPublicComponent, data: { titleI18n: 'menu.extras.status' } }]
  },
  // passport
  {
    path: 'passport',
    component: LayoutPassportComponent,
    children: [
      { path: 'login', component: UserLoginComponent, data: { titleI18n: 'app.login.login' } },
      { path: 'lock', component: UserLockComponent, data: { titleI18n: 'app.lock' } }
    ]
  },
  { path: '**', redirectTo: 'exception/404' }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      useHash: environment.useHash,
      // NOTICE: If you use `reuse-tab` component and turn on keepingScroll you can set to `disabled`
      // Pls refer to https://ng-alain.com/components/reuse-tab
      scrollPositionRestoration: 'top'
    })
  ],
  exports: [RouterModule]
})
export class RouteRoutingModule {}
