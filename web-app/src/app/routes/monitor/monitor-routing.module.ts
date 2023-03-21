import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { MonitorDetailComponent } from './monitor-detail/monitor-detail.component';
import { MonitorEditComponent } from './monitor-edit/monitor-edit.component';
import { MonitorListComponent } from './monitor-list/monitor-list.component';
import { MonitorNewComponent } from './monitor-new/monitor-new.component';

const routes: Routes = [
  { path: '', component: MonitorListComponent },
  { path: 'new', component: MonitorNewComponent },
  { path: ':monitorId/edit', component: MonitorEditComponent },
  { path: ':monitorId', component: MonitorDetailComponent, data: { titleI18n: 'monitors.detail' } },
  { path: '**', component: MonitorListComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MonitorRoutingModule {}
