import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CollectorComponent } from './collector/collector.component';
import { DefineComponent } from './define/define.component';
import { MessageServerComponent } from './settings/message-server/message-server.component';
import { ObjectStoreComponent } from './settings/object-store/object-store.component';
import { SettingsComponent } from './settings/settings.component';
import { SystemConfigComponent } from './settings/system-config/system-config.component';
import { StatusComponent } from './status/status.component';
import { SettingTagsComponent } from './tags/tags.component';

const routes: Routes = [
  { path: 'tags', component: SettingTagsComponent },
  { path: 'collector', component: CollectorComponent },
  { path: 'status', component: StatusComponent },
  { path: 'define', component: DefineComponent, data: { titleI18n: 'menu.extras.define' } },
  {
    path: 'settings',
    component: SettingsComponent,
    children: [
      { path: '', redirectTo: 'config', pathMatch: 'full' },
      {
        path: 'server',
        component: MessageServerComponent,
        data: { titleI18n: 'settings.server' }
      },
      {
        path: 'config',
        component: SystemConfigComponent,
        data: { titleI18n: 'settings.system-config' }
      },
      {
        path: 'object-store',
        component: ObjectStoreComponent,
        data: { titleI18n: 'settings.object-store' }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SettingRoutingModule {}
