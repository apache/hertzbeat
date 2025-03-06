/* eslint-disable import/order */
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { GlobalFooterModule } from '@delon/abc/global-footer';
import { AlainThemeModule } from '@delon/theme';
import { LayoutDefaultModule } from '@delon/theme/layout-default';
import { SettingDrawerModule } from '@delon/theme/setting-drawer';
import { ThemeBtnModule } from '@delon/theme/theme-btn';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { LayoutBasicComponent } from './basic/basic.component';
import { HeaderFullScreenComponent } from './basic/widgets/fullscreen.component';
import { HeaderI18nComponent } from './basic/widgets/i18n.component';
import { HeaderSearchComponent } from './basic/widgets/search.component';
import { HeaderUserComponent } from './basic/widgets/user.component';
import { HeaderNotifyComponent } from './basic/widgets/notify.component';
import { LayoutBlankComponent } from './blank/blank.component';

const COMPONENTS = [LayoutBasicComponent, LayoutBlankComponent, HeaderI18nComponent];

const HEADER_COMPONENTS = [
  HeaderSearchComponent,
  HeaderFullScreenComponent,
  HeaderI18nComponent,
  HeaderUserComponent,
  HeaderNotifyComponent
];

import { LayoutPassportComponent } from './passport/passport.component';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzListComponent, NzListItemActionComponent, NzListItemComponent, NzListItemMetaComponent } from 'ng-zorro-antd/list';
import { NzStringTemplateOutletDirective } from 'ng-zorro-antd/core/outlet';
import { NzTooltipDirective } from 'ng-zorro-antd/tooltip';
import { NzCheckboxComponent } from 'ng-zorro-antd/checkbox';
const PASSPORT = [LayoutPassportComponent];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    AlainThemeModule.forChild(),
    ThemeBtnModule,
    SettingDrawerModule,
    LayoutDefaultModule,
    GlobalFooterModule,
    NzDropDownModule,
    NzInputModule,
    NzAutocompleteModule,
    NzGridModule,
    NzFormModule,
    NzSpinModule,
    NzBadgeModule,
    NzAvatarModule,
    NzIconModule,
    NzButtonModule,
    NzModalModule,
    NzTagModule,
    NzDividerModule,
    NzListComponent,
    NzListItemComponent,
    NzListItemMetaComponent,
    NzStringTemplateOutletDirective,
    NzListItemActionComponent,
    NzTooltipDirective,
    NzCheckboxComponent
  ],
  declarations: [...COMPONENTS, ...HEADER_COMPONENTS, ...PASSPORT],
  exports: [...COMPONENTS, ...PASSPORT]
})
export class LayoutModule {}
