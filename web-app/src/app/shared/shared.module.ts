import { CommonModule } from '@angular/common';
import { NgModule, Type } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DelonACLModule } from '@delon/acl';
import { DelonFormModule } from '@delon/form';
import { AlainThemeModule } from '@delon/theme';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzDividerComponent } from 'ng-zorro-antd/divider';
import { NzRadioComponent, NzRadioGroupComponent } from 'ng-zorro-antd/radio';
import { NzSwitchComponent } from 'ng-zorro-antd/switch';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { FormFieldComponent } from './components/form-field/form-field.component';
import { HelpMessageShowComponent } from './components/help-message-show/help-message-show.component';
import { KeyValueInputComponent } from './components/key-value-input/key-value-input.component';
import { MetricsFieldInputComponent } from './components/metrics-field-input/metrics-field-input.component';
import { MonitorSelectMenuComponent } from './components/monitor-select-menu/monitor-select-menu.component';
import { MultiFuncInputComponent } from './components/multi-func-input/multi-func-input.component';
import { TagsSelectComponent } from './components/tags-select/tags-select.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { ElapsedTimePipe } from './pipe/elapsed-time.pipe';
import { I18nElsePipe } from './pipe/i18n-else.pipe';
import { TimezonePipe } from './pipe/timezone.pipe';
import { SHARED_DELON_MODULES } from './shared-delon.module';
import { SHARED_ZORRO_MODULES } from './shared-zorro.module';
import { ChatbotComponent } from './components/chatbot/chatbot.component';
import { ChatMessageComponent } from './components/chat-message/chat-message.component';

const ThirdModules: Array<Type<void>> = [];
const COMPONENTS: Array<Type<void>> = [
  KeyValueInputComponent,
  MultiFuncInputComponent,
  TagsSelectComponent,
  HelpMessageShowComponent,
  MetricsFieldInputComponent,
  ToolbarComponent,
  FormFieldComponent,
  MonitorSelectMenuComponent,
  ChatbotComponent,
  ChatMessageComponent
];
const DIRECTIVES: Array<Type<void>> = [TimezonePipe, I18nElsePipe, ElapsedTimePipe];

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
    ...ThirdModules,
    NzBreadCrumbModule,
    NzTagModule,
    NzDividerComponent,
    NzRadioGroupComponent,
    NzRadioComponent,
    NzSwitchComponent
  ],
  declarations: [...COMPONENTS, ...DIRECTIVES, HelpMessageShowComponent],
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
    ...ThirdModules,
    ...COMPONENTS,
    ...DIRECTIVES
  ]
})
export class SharedModule { }
