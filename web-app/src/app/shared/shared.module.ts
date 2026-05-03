import { CommonModule } from '@angular/common';
import { NgModule, Type } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DelonACLModule } from '@delon/acl';
import { DelonFormModule } from '@delon/form';
import { AlainThemeModule } from '@delon/theme';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDividerComponent } from 'ng-zorro-antd/divider';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzRadioComponent, NzRadioGroupComponent } from 'ng-zorro-antd/radio';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzSwitchComponent } from 'ng-zorro-antd/switch';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { CodeBlockComponent } from './components/code-block/code-block.component';
import { ConfigurableFieldComponent } from './components/configurable-field/configurable-field.component';
import { FormFieldComponent } from './components/form-field/form-field.component';
import { HelpMessageShowComponent } from './components/help-message-show/help-message-show.component';
import { LabelSelectorComponent } from './components/label-selector/label-selector.component';
import { MonitorSelectListComponent } from './components/monitor-select-list/monitor-select-list.component';
import { MonitorSelectMenuComponent } from './components/monitor-select-menu/monitor-select-menu.component';
import { MultiFuncInputComponent } from './components/multi-func-input/multi-func-input.component';
import { PageShellComponent } from './components/page-shell/page-shell.component';
import { PlatformChartCardComponent } from './components/platform-chart-card/platform-chart-card.component';
import { PlatformColumnHeaderRowComponent } from './components/platform-column-header-row/platform-column-header-row.component';
import { PlatformCopyrightFooterComponent } from './components/platform-copyright-footer/platform-copyright-footer.component';
import { PlatformContextChipBarComponent } from './components/platform-context-chip-bar/platform-context-chip-bar.component';
import { PlatformDrawerCalloutCardComponent } from './components/platform-drawer-callout-card/platform-drawer-callout-card.component';
import { PlatformDrawerAttributeListComponent } from './components/platform-drawer-attribute-list/platform-drawer-attribute-list.component';
import { PlatformDrawerActionLinksComponent } from './components/platform-drawer-action-links/platform-drawer-action-links.component';
import { PlatformDrawerFactsComponent } from './components/platform-drawer-facts/platform-drawer-facts.component';
import { PlatformDrawerCodePreviewComponent } from './components/platform-drawer-code-preview/platform-drawer-code-preview.component';
import { PlatformDrawerSectionComponent } from './components/platform-drawer-section/platform-drawer-section.component';
import { PlatformDrawerPillRowComponent } from './components/platform-drawer-pill-row/platform-drawer-pill-row.component';
import { PlatformDrawerPreviewListComponent } from './components/platform-drawer-preview-list/platform-drawer-preview-list.component';
import { PlatformDrawerSectionListComponent } from './components/platform-drawer-section-list/platform-drawer-section-list.component';
import { PlatformDrawerShellComponent } from './components/platform-drawer-shell/platform-drawer-shell.component';
import { PlatformDrawerToolbarComponent } from './components/platform-drawer-toolbar/platform-drawer-toolbar.component';
import { PlatformFactsStripComponent } from './components/platform-facts-strip/platform-facts-strip.component';
import { PlatformKeyValueGridComponent } from './components/platform-key-value-grid/platform-key-value-grid.component';
import { PlatformPanelHeaderComponent } from './components/platform-panel-header/platform-panel-header.component';
import { PlatformRailNavComponent } from './components/platform-rail-nav/platform-rail-nav.component';
import { PlatformSectionHeaderComponent } from './components/platform-section-header/platform-section-header.component';
import { PlatformStageInsightListComponent } from './components/platform-stage-insight-list/platform-stage-insight-list.component';
import { PlatformStageMetaHeaderComponent } from './components/platform-stage-meta-header/platform-stage-meta-header.component';
import { PlatformStageSectionComponent } from './components/platform-stage-section/platform-stage-section.component';
import { PlatformSupportActionBarComponent } from './components/platform-support-action-bar/platform-support-action-bar.component';
import { PlatformSupportPanelComponent } from './components/platform-support-panel/platform-support-panel.component';
import { PlatformSupportLinkListComponent } from './components/platform-support-link-list/platform-support-link-list.component';
import { PlatformSummaryMetricGridComponent } from './components/platform-summary-metric-grid/platform-summary-metric-grid.component';
import { PlatformTraceWaterfallPreviewComponent } from './components/platform-trace-waterfall-preview/platform-trace-waterfall-preview.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { WorkspaceGuidancePanelComponent } from './components/workspace-guidance-panel/workspace-guidance-panel.component';
import { MarkdownMermaidDirective } from './directives/markdown-mermaid.directive';
import { ElapsedTimePipe } from './pipe/elapsed-time.pipe';
import { I18nElsePipe } from './pipe/i18n-else.pipe';
import { TimezonePipe } from './pipe/timezone.pipe';
import { SHARED_DELON_MODULES } from './shared-delon.module';
import { SHARED_ZORRO_MODULES } from './shared-zorro.module';

const ThirdModules: Array<Type<void>> = [];
const COMPONENTS: Array<Type<void>> = [
  MultiFuncInputComponent,
  CodeBlockComponent,
  HelpMessageShowComponent,
  PlatformDrawerCodePreviewComponent,
  ToolbarComponent,
  ConfigurableFieldComponent,
  FormFieldComponent,
  MonitorSelectMenuComponent,
  MonitorSelectListComponent,
  LabelSelectorComponent
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
    NzSwitchComponent,
    NzButtonModule,
    NzInputModule,
    NzIconModule,
    NzSpinModule,
    PageShellComponent,
    PlatformChartCardComponent,
    PlatformColumnHeaderRowComponent,
    PlatformContextChipBarComponent,
    PlatformCopyrightFooterComponent,
    PlatformDrawerCalloutCardComponent,
    PlatformDrawerActionLinksComponent,
    PlatformDrawerAttributeListComponent,
    PlatformDrawerFactsComponent,
    PlatformDrawerPreviewListComponent,
    PlatformDrawerPillRowComponent,
    PlatformDrawerSectionComponent,
    PlatformDrawerSectionListComponent,
    PlatformDrawerShellComponent,
    PlatformDrawerToolbarComponent,
    PlatformFactsStripComponent,
    PlatformKeyValueGridComponent,
    PlatformPanelHeaderComponent,
    PlatformRailNavComponent,
    PlatformSectionHeaderComponent,
    PlatformStageInsightListComponent,
    PlatformStageMetaHeaderComponent,
    PlatformStageSectionComponent,
    PlatformSupportActionBarComponent,
    PlatformSupportPanelComponent,
    PlatformSupportLinkListComponent,
    PlatformSummaryMetricGridComponent,
    PlatformTraceWaterfallPreviewComponent,
    WorkspaceGuidancePanelComponent,
    MarkdownMermaidDirective
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
    ...DIRECTIVES,
    PageShellComponent,
    PlatformChartCardComponent,
    PlatformColumnHeaderRowComponent,
    PlatformContextChipBarComponent,
    PlatformCopyrightFooterComponent,
    PlatformDrawerCalloutCardComponent,
    PlatformDrawerActionLinksComponent,
    PlatformDrawerAttributeListComponent,
    PlatformDrawerFactsComponent,
    PlatformDrawerPreviewListComponent,
    PlatformDrawerPillRowComponent,
    PlatformDrawerSectionComponent,
    PlatformDrawerSectionListComponent,
    PlatformDrawerShellComponent,
    PlatformDrawerToolbarComponent,
    PlatformFactsStripComponent,
    PlatformKeyValueGridComponent,
    PlatformPanelHeaderComponent,
    PlatformRailNavComponent,
    PlatformSectionHeaderComponent,
    PlatformStageInsightListComponent,
    PlatformStageMetaHeaderComponent,
    PlatformStageSectionComponent,
    PlatformSupportActionBarComponent,
    PlatformSupportPanelComponent,
    PlatformSupportLinkListComponent,
    PlatformSummaryMetricGridComponent,
    PlatformTraceWaterfallPreviewComponent,
    WorkspaceGuidancePanelComponent,
    MarkdownMermaidDirective
  ]
})
export class SharedModule {}
