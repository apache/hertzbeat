import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DefineComponent } from './define/define.component';
import { SettingTagsComponent } from './tags/tags.component';

const routes: Routes = [
  { path: 'tags', component: SettingTagsComponent },
  { path: 'define', component: DefineComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SettingRoutingModule {}
