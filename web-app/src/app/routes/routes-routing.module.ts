import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { environment } from '@env/environment';

import { DetectAuthGuard } from '../core/guard/detect-auth-guard';
import { LayoutBasicComponent } from '../layout/basic/basic.component';
import { OpsPlaceholderPageComponent } from './ops-placeholder/ops-placeholder-page.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutBasicComponent,
    canActivate: [DetectAuthGuard],
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'dashboard', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule) },
      { path: 'exception', loadChildren: () => import('./exception/exception.module').then(m => m.ExceptionModule) },
      {
        path: 'entities',
        loadChildren: () => import('./entity/entity.module').then(m => m.EntityModule),
        data: { titleI18n: 'entity.list' }
      },
      {
        path: 'monitors',
        loadChildren: () => import('./monitor/monitor.module').then(m => m.MonitorModule),
        data: { titleI18n: 'menu.monitor.center' }
      },
      {
        path: 'ingestion',
        loadChildren: () => import('./ingestion/ingestion.module').then(m => m.IngestionModule),
        data: { titleI18n: 'menu.ingestion.center' }
      },
      { path: 'alerts', redirectTo: 'alert', pathMatch: 'full' },
      { path: 'alert', loadChildren: () => import('./alert/alert.module').then(m => m.AlertModule) },
      {
        path: 'incidents',
        component: OpsPlaceholderPageComponent,
        data: {
          title: 'Incidents',
          subtitle: 'Problem-first response board with timeline, ownership, and recommended actions.',
          tags: ['incident shell', 'response timeline', 'owner-first']
        }
      },
      {
        path: 'actions',
        component: OpsPlaceholderPageComponent,
        data: {
          title: 'Actions',
          subtitle: 'Automation catalog, execution history, and approval-aware operations all stay in one context.',
          tags: ['automation catalog', 'risk-aware actions', 'approval flow']
        }
      },
      {
        path: 'topology',
        component: OpsPlaceholderPageComponent,
        data: {
          title: 'Topology',
          subtitle: 'Dependency graph, blast radius, and owner visibility share the same global context.',
          tags: ['graph shell', 'blast radius', 'owner visibility']
        }
      },
      {
        path: 'explorer',
        component: OpsPlaceholderPageComponent,
        data: {
          title: 'Explorer',
          subtitle: 'Unified query surface for signals, filters, and drill-down without leaving the workspace.',
          tags: ['query shell', 'context-preserving', 'signal explorer']
        }
      },
      { path: 'setting', loadChildren: () => import('./setting/setting.module').then(m => m.SettingModule) }
    ]
  },
  {
    path: 'passport',
    loadChildren: () => import('./passport/passport.module').then(m => m.PassportModule)
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
