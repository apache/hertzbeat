import { ClipboardModule } from '@angular/cdk/clipboard';
import { NgModule, Type } from '@angular/core';
import { SharedModule } from '@shared';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzCascaderModule } from 'ng-zorro-antd/cascader';
import { NzCodeEditorModule } from 'ng-zorro-antd/code-editor';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { ColorPickerModule } from 'ngx-color-picker';

import { CollectorComponent } from './collector/collector.component';
import { DefineComponent } from './define/define.component';
import { SettingRoutingModule } from './setting-routing.module';
import { MessageServerComponent } from './settings/message-server/message-server.component';
import { ObjectStoreComponent } from './settings/object-store/object-store.component';
import { SettingsComponent } from './settings/settings.component';
import { SystemConfigComponent } from './settings/system-config/system-config.component';
import { StatusComponent } from './status/status.component';
import { SettingTagsComponent } from './tags/tags.component';

const COMPONENTS: Array<Type<void>> = [
  SettingTagsComponent,
  DefineComponent,
  SettingsComponent,
  MessageServerComponent,
  SystemConfigComponent,
  ObjectStoreComponent,
  CollectorComponent,
  StatusComponent
];

@NgModule({
  imports: [
    SharedModule,
    SettingRoutingModule,
    NzDividerModule,
    NzBreadCrumbModule,
    NzCascaderModule,
    NzCollapseModule,
    NzListModule,
    NzSwitchModule,
    ColorPickerModule,
    NzTagModule,
    NzLayoutModule,
    NzCodeEditorModule,
    ClipboardModule,
    NzBadgeModule,
    NzRadioModule
  ],
  declarations: COMPONENTS
})
export class SettingModule {}
