import { ClipboardModule } from '@angular/cdk/clipboard';
import { NgModule, Type } from '@angular/core';
import { SharedModule } from '@shared';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { NgxEchartsModule } from 'ngx-echarts';

import { MonitorDataChartComponent } from './monitor-data-chart/monitor-data-chart.component';
import { MonitorDataTableComponent } from './monitor-data-table/monitor-data-table.component';
import { MonitorDetailComponent } from './monitor-detail/monitor-detail.component';
import { MonitorEditComponent } from './monitor-edit/monitor-edit.component';
import { MonitorListComponent } from './monitor-list/monitor-list.component';
import { MonitorNewComponent } from './monitor-new/monitor-new.component';
import { MonitorRoutingModule } from './monitor-routing.module';

const COMPONENTS: Array<Type<void>> = [
  MonitorNewComponent,
  MonitorEditComponent,
  MonitorListComponent,
  MonitorDetailComponent,
  MonitorDataTableComponent,
  MonitorDataChartComponent
];

@NgModule({
  imports: [
    SharedModule,
    MonitorRoutingModule,
    NzBreadCrumbModule,
    NzDividerModule,
    NzSwitchModule,
    NzTagModule,
    NzRadioModule,
    NgxEchartsModule,
    NzLayoutModule,
    NzSpaceModule,
    NzCollapseModule,
    ClipboardModule,
    NzUploadModule
  ],
  declarations: COMPONENTS
})
export class MonitorModule {}
