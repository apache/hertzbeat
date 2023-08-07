import { CommonModule } from '@angular/common';
import { NgModule, Type } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DelonACLModule } from '@delon/acl';
import { DelonFormModule } from '@delon/form';
import { AlainThemeModule } from '@delon/theme';

import { HelpMassageShowComponent } from './components/help-massage-show/help-massage-show.component';
import { KeyValueInputComponent } from './components/key-value-input/key-value-input.component';
import { TimezonePipe } from './pipe/timezone.pipe';
import { SHARED_DELON_MODULES } from './shared-delon.module';
import { SHARED_ZORRO_MODULES } from './shared-zorro.module';
import {NzBreadCrumbModule} from "ng-zorro-antd/breadcrumb";
import {NzTagModule} from "ng-zorro-antd/tag";


// #region third libs

const THIRDMODULES: Array<Type<void>> = [];

// #endregion

// #region your components & directives

const COMPONENTS: Array<Type<void>> = [KeyValueInputComponent, HelpMassageShowComponent];
const DIRECTIVES: Array<Type<void>> = [TimezonePipe];

// #endregion

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ReactiveFormsModule,
    AlainThemeModule.forChild(),
    DelonACLModule,
    DelonFormModule,
    ...SHARED_DELON_MODULES,
    ...SHARED_ZORRO_MODULES,
    // third libs
    ...THIRDMODULES,
    NzBreadCrumbModule,
    NzTagModule
  ],
  declarations: [
    // your components
    ...COMPONENTS,
    ...DIRECTIVES,
    HelpMassageShowComponent
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    AlainThemeModule,
    DelonACLModule,
    DelonFormModule,
    ...SHARED_DELON_MODULES,
    ...SHARED_ZORRO_MODULES,
    // third libs
    ...THIRDMODULES,
    // your components
    ...COMPONENTS,
    ...DIRECTIVES
  ]
})
export class SharedModule {}
