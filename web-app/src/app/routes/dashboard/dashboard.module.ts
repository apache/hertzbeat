import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { I18nPipe } from '@delon/theme';
import { NzButtonModule } from 'ng-zorro-antd/button';

import { ActivityTimelineComponent } from '../../shared/components/activity-timeline/activity-timeline.component';
import { PlatformDrawerCalloutCardComponent } from '../../shared/components/platform-drawer-callout-card/platform-drawer-callout-card.component';
import { PageShellComponent } from '../../shared/components/page-shell/page-shell.component';
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component';
import { WorkspaceGuidancePanelComponent } from '../../shared/components/workspace-guidance-panel/workspace-guidance-panel.component';
import { DashboardComponent } from './dashboard.component';
import { DashboardRoutingModule } from './dashboard-routing.module';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    NzButtonModule,
    I18nPipe,
    DashboardRoutingModule,
    PageShellComponent,
    SummaryCardComponent,
    ActivityTimelineComponent,
    PlatformDrawerCalloutCardComponent,
    WorkspaceGuidancePanelComponent
  ],
  declarations: [DashboardComponent]
})
export class DashboardModule {}
