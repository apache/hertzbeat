import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SettingTagsComponent } from './tags/tags.component';

const routes: Routes = [{ path: 'tags', component: SettingTagsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SettingRoutingModule {}
