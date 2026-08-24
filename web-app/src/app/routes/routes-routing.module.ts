import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { environment } from '@env/environment';

import { DetectAuthGuard } from '../core/guard/detect-auth-guard';
import { LayoutBasicComponent } from '../layout/basic/basic.component';
import { LayoutBlankComponent } from '../layout/blank/blank.component';
import { LayoutPassportComponent } from '../layout/passport/passport.component';
import { BulletinComponent } from './bulletin/bulletin.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { UserLockComponent } from './passport/lock/lock.component';
import { UserLoginComponent } from './passport/login/login.component';
import { StatusPublicComponent } from './status-public/status-public.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutBasicComponent,
    canActivate: [DetectAuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent, data: { titleI18n: 'menu.dashboard' } },
      { path: 'bulletin', component: BulletinComponent, data: { titleI18n: 'menu.monitor.bulletin' } },
      { path: 'exception', loadChildren: () => import('./exception/exception.module').then(m => m.ExceptionModule) },
      {
        path: 'monitors',
        loadChildren: () => import('./monitor/monitor.module').then(m => m.MonitorModule),
        data: { titleI18n: 'menu.monitor.center' }
      },
      { path: 'log', loadChildren: () => import('./log/log.module').then(m => m.LogModule) },
      {
        path: 'observability/integration',
        loadComponent: () => import('./log/log-integration/log-integration.component').then(m => m.LogIntegrationComponent),
        data: { titleI18n: 'menu.observability.integration' }
      },
      {
        path: 'metrics/manage',
        loadComponent: () => import('./metrics/metrics-manage.component').then(m => m.MetricsManageComponent),
        data: { titleI18n: 'menu.observability.metrics' }
      },
      {
        path: 'trace/manage',
        loadComponent: () => import('./trace/trace-manage.component').then(m => m.TraceManageComponent),
        data: { titleI18n: 'menu.observability.traces' }
      },
      { path: 'alert', loadChildren: () => import('./alert/alert.module').then(m => m.AlertModule) },
      { path: 'setting', loadChildren: () => import('./setting/setting.module').then(m => m.SettingModule) }
    ]
  },
  {
    path: 'status',
    component: LayoutBlankComponent,
    children: [{ path: '', component: StatusPublicComponent, data: { titleI18n: 'menu.advanced.status' } }]
  },
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
      scrollPositionRestoration: 'top'
    })
  ],
  exports: [RouterModule]
})
export class RouteRoutingModule {}
