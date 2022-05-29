import { NgModule, Type } from '@angular/core';
import { SharedModule } from '@shared';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzCascaderModule } from 'ng-zorro-antd/cascader';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { ColorPickerModule } from 'ngx-color-picker';

import { SettingRoutingModule } from './setting-routing.module';
import { SettingTagsComponent } from './tags/tags.component';

const COMPONENTS: Array<Type<void>> = [SettingTagsComponent];

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
    NzTagModule
  ],
  declarations: COMPONENTS
})
export class SettingModule {}
