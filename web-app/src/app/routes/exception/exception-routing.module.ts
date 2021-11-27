import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ExceptionComponent } from './exception.component';
import { ExceptionTriggerComponent } from './trigger.component';

const routes: Routes = [
  { path: '403', component: ExceptionComponent, data: { type: 403 } },
  { path: '404', component: ExceptionComponent, data: { type: 404 } },
  { path: '500', component: ExceptionComponent, data: { type: 500 } },
  { path: 'trigger', component: ExceptionTriggerComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ExceptionRoutingModule {}
