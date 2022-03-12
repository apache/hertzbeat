import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzTableQueryParams } from 'ng-zorro-antd/table';

import { Monitor } from '../../../pojo/Monitor';
import { MonitorService } from '../../../service/monitor.service';

@Component({
  selector: 'app-monitor-list',
  templateUrl: './monitor-list.component.html',
  styles: []
})
export class MonitorListComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private modal: NzModalService,
    private notifySvc: NzNotificationService,
    private msg: NzMessageService,
    private monitorSvc: MonitorService
  ) {}

  app!: string;
  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;
  monitors!: Monitor[];
  tableLoading: boolean = true;
  checkedMonitorIds = new Set<number>();

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(paramMap => {
      this.app = paramMap.get('app') || '';
      this.pageIndex = 1;
      this.pageSize = 8;
      this.checkedMonitorIds = new Set<number>();
      this.tableLoading = true;
      this.loadMonitorTable();
    });
  }

  sync() {
    this.loadMonitorTable();
  }

  loadMonitorTable() {
    this.tableLoading = true;
    let monitorInit$ = this.monitorSvc.getMonitors(this.app, this.pageIndex - 1, this.pageSize).subscribe(
      message => {
        this.tableLoading = false;
        this.checkedAll = false;
        this.checkedMonitorIds.clear();
        if (message.code === 0) {
          let page = message.data;
          this.monitors = page.content;
          this.pageIndex = page.number + 1;
          this.total = page.totalElements;
        } else {
          console.warn(message.msg);
        }
        monitorInit$.unsubscribe();
      },
      error => {
        this.tableLoading = false;
        monitorInit$.unsubscribe();
      }
    );
  }

  onEditOneMonitor(monitorId: number) {
    if (monitorId == null) {
      this.notifySvc.warning('未选中任何待编辑项！', '');
      return;
    }
    this.router.navigateByUrl(`/monitors/${monitorId}/edit`);
    // 参数样例
    // this.router.navigate(['/monitors/new'],{queryParams: {app: "linux"}});
  }

  onEditMonitor() {
    // 编辑时只能选中一个监控
    if (this.checkedMonitorIds == null || this.checkedMonitorIds.size === 0) {
      this.notifySvc.warning('未选中任何待编辑项！', '');
      return;
    }
    if (this.checkedMonitorIds.size > 1) {
      this.notifySvc.warning('只能对一个选中项进行编辑！', '');
      return;
    }
    let monitorId = 0;
    this.checkedMonitorIds.forEach(item => (monitorId = item));
    this.router.navigateByUrl(`/monitors/${monitorId}/edit`);
  }

  onDeleteOneMonitor(monitorId: number) {
    let monitors = new Set<number>();
    monitors.add(monitorId);
    this.modal.confirm({
      nzTitle: '请确认是否删除！',
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOkType: 'primary',
      nzOnOk: () => this.deleteMonitors(monitors)
    });
  }

  onDeleteMonitors() {
    if (this.checkedMonitorIds == null || this.checkedMonitorIds.size === 0) {
      this.notifySvc.warning('未选中任何待删除项！', '');
      return;
    }
    this.modal.confirm({
      nzTitle: '请确认是否批量删除！',
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOkType: 'primary',
      nzOnOk: () => this.deleteMonitors(this.checkedMonitorIds)
    });
  }

  deleteMonitors(monitors: Set<number>) {
    if (monitors == null || monitors.size == 0) {
      this.notifySvc.warning('未选中任何待删除项！', '');
      return;
    }
    this.tableLoading = true;
    const deleteMonitors$ = this.monitorSvc.deleteMonitors(monitors).subscribe(
      message => {
        deleteMonitors$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success('删除成功！', '');
          this.loadMonitorTable();
        } else {
          this.tableLoading = false;
          this.notifySvc.error('删除失败！', message.msg);
        }
      },
      error => {
        this.tableLoading = false;
        deleteMonitors$.unsubscribe();
        this.notifySvc.error('删除失败！', error.msg);
      }
    );
  }

  onCancelManageMonitors() {
    if (this.checkedMonitorIds == null || this.checkedMonitorIds.size === 0) {
      this.notifySvc.warning('未选中任何待取消项！', '');
      return;
    }
    this.modal.confirm({
      nzTitle: '请确认是否批量取消监控！',
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOkType: 'primary',
      nzOnOk: () => this.cancelManageMonitors(this.checkedMonitorIds)
    });
  }

  onCancelManageOneMonitor(monitorId: number) {
    let monitors = new Set<number>();
    monitors.add(monitorId);
    this.modal.confirm({
      nzTitle: '请确认是否取消监控！',
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOkType: 'primary',
      nzOnOk: () => this.cancelManageMonitors(monitors)
    });
  }

  cancelManageMonitors(monitors: Set<number>) {
    this.tableLoading = true;
    const cancelManage$ = this.monitorSvc.cancelManageMonitors(monitors).subscribe(
      message => {
        cancelManage$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success('取消监控成功！', '');
          this.loadMonitorTable();
        } else {
          this.tableLoading = false;
          this.notifySvc.error('取消监控失败！', message.msg);
        }
      },
      error => {
        this.tableLoading = false;
        cancelManage$.unsubscribe();
        this.notifySvc.error('取消监控失败！', error.msg);
      }
    );
  }

  onEnableManageMonitors() {
    if (this.checkedMonitorIds == null || this.checkedMonitorIds.size === 0) {
      this.notifySvc.warning('未选中任何待启用监控项！', '');
      return;
    }
    this.modal.confirm({
      nzTitle: '请确认是否批量启用监控！',
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOkType: 'primary',
      nzOnOk: () => this.enableManageMonitors(this.checkedMonitorIds)
    });
  }

  onEnableManageOneMonitor(monitorId: number) {
    let monitors = new Set<number>();
    monitors.add(monitorId);
    this.modal.confirm({
      nzTitle: '请确认是否启用监控！',
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOkType: 'primary',
      nzOnOk: () => this.enableManageMonitors(monitors)
    });
  }

  enableManageMonitors(monitors: Set<number>) {
    this.tableLoading = true;
    const enableManage$ = this.monitorSvc.enableManageMonitors(monitors).subscribe(
      message => {
        enableManage$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success('启用监控成功！', '');
          this.loadMonitorTable();
        } else {
          this.tableLoading = false;
          this.notifySvc.error('启用监控失败！', message.msg);
        }
      },
      error => {
        this.tableLoading = false;
        enableManage$.unsubscribe();
        this.notifySvc.error('启用监控失败！', error.msg);
      }
    );
  }

  // begin: 列表多选逻辑
  checkedAll: boolean = false;
  onAllChecked(checked: boolean) {
    if (checked) {
      this.monitors.forEach(monitor => this.checkedMonitorIds.add(monitor.id));
    } else {
      this.checkedMonitorIds.clear();
    }
  }
  onItemChecked(monitorId: number, checked: boolean) {
    if (checked) {
      this.checkedMonitorIds.add(monitorId);
    } else {
      this.checkedMonitorIds.delete(monitorId);
    }
  }
  // end: 列表多选逻辑

  /**
   * 分页回调
   *
   * @param params 页码信息
   */
  onTablePageChange(params: NzTableQueryParams) {
    const { pageSize, pageIndex, sort, filter } = params;
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
    this.loadMonitorTable();
  }
}
