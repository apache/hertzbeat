import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DefineComponent } from './define/define.component';
import { MessageServerComponent } from './settings/message-server/message-server.component';
import { SettingsComponent } from './settings/settings.component';
import { SettingTagsComponent } from './tags/tags.component';

const routes: Routes = [
  { path: 'tags', component: SettingTagsComponent },
  { path: 'define', component: DefineComponent, data: { titleI18n: 'menu.extras.define' } },
  {
    path: 'settings',
    component: SettingsComponent,
    children: [
      { path: '', redirectTo: 'server', pathMatch: 'full' },
      {
        path: 'server',
        component: MessageServerComponent,
        data: { titleI18n: 'settings.server' }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SettingRoutingModule {}
