import { Component, Inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
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
    private monitorSvc: MonitorService,
    private messageSvc: NzMessageService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  app!: string;
  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;
  monitors!: Monitor[];
  tableLoading: boolean = true;
  checkedMonitorIds = new Set<number>();
  // 过滤搜索
  filterContent!: string;
  filterStatus: number = 9;

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(paramMap => {
      this.app = paramMap.get('app') || '';
      if (this.app == '') {
        this.router.navigateByUrl('/monitors?app=website');
      }
      this.pageIndex = 1;
      this.pageSize = 8;
      this.checkedMonitorIds = new Set<number>();
      this.tableLoading = true;
      this.loadMonitorTable();
    });
  }

  onFilterSearchMonitors() {
    this.tableLoading = true;
    let filter$ = this.monitorSvc
      .searchMonitors(this.app, this.filterContent, this.filterStatus, this.pageIndex - 1, this.pageSize)
      .subscribe(
        message => {
          filter$.unsubscribe();
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
        },
        error => {
          this.tableLoading = false;
          filter$.unsubscribe();
          console.error(error.msg);
        }
      );
  }

  sync() {
    this.loadMonitorTable();
  }

  loadMonitorTable(sortField?: string | null, sortOrder?: string | null) {
    this.tableLoading = true;
    let monitorInit$ = this.monitorSvc.getMonitors(this.app, this.pageIndex - 1, this.pageSize, sortField, sortOrder).subscribe(
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
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-edit'), '');
      return;
    }
    this.router.navigateByUrl(`/monitors/${monitorId}/edit`);
    // 参数样例
    // this.router.navigate(['/monitors/new'],{queryParams: {app: "linux"}});
  }

  onEditMonitor() {
    // 编辑时只能选中一个监控
    if (this.checkedMonitorIds == null || this.checkedMonitorIds.size === 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-edit'), '');
      return;
    }
    if (this.checkedMonitorIds.size > 1) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.one-select-edit'), '');
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
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.deleteMonitors(monitors)
    });
  }

  onDeleteMonitors() {
    if (this.checkedMonitorIds == null || this.checkedMonitorIds.size === 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-delete'), '');
      return;
    }
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete-batch'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.deleteMonitors(this.checkedMonitorIds)
    });
  }

  deleteMonitors(monitors: Set<number>) {
    if (monitors == null || monitors.size == 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-delete'), '');
      return;
    }
    this.tableLoading = true;
    const deleteMonitors$ = this.monitorSvc.deleteMonitors(monitors).subscribe(
      message => {
        deleteMonitors$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
          this.loadMonitorTable();
        } else {
          this.tableLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), message.msg);
        }
      },
      error => {
        this.tableLoading = false;
        deleteMonitors$.unsubscribe();
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), error.msg);
      }
    );
  }

  onCancelManageMonitors() {
    if (this.checkedMonitorIds == null || this.checkedMonitorIds.size === 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-cancel'), '');
      return;
    }
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.cancel-batch'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.cancelManageMonitors(this.checkedMonitorIds)
    });
  }

  onCancelManageOneMonitor(monitorId: number) {
    let monitors = new Set<number>();
    monitors.add(monitorId);
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.cancel'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.cancelManageMonitors(monitors)
    });
  }

  cancelManageMonitors(monitors: Set<number>) {
    this.tableLoading = true;
    const cancelManage$ = this.monitorSvc.cancelManageMonitors(monitors).subscribe(
      message => {
        cancelManage$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.cancel-success'), '');
          this.loadMonitorTable();
        } else {
          this.tableLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.cancel-fail'), message.msg);
        }
      },
      error => {
        this.tableLoading = false;
        cancelManage$.unsubscribe();
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.cancel-fail'), error.msg);
      }
    );
  }

  onEnableManageMonitors() {
    if (this.checkedMonitorIds == null || this.checkedMonitorIds.size === 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-enable'), '');
      return;
    }
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.enable-batch'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.enableManageMonitors(this.checkedMonitorIds)
    });
  }

  onEnableManageOneMonitor(monitorId: number) {
    let monitors = new Set<number>();
    monitors.add(monitorId);
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.enable'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.enableManageMonitors(monitors)
    });
  }

  enableManageMonitors(monitors: Set<number>) {
    this.tableLoading = true;
    const enableManage$ = this.monitorSvc.enableManageMonitors(monitors).subscribe(
      message => {
        enableManage$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.enable-success'), '');
          this.loadMonitorTable();
        } else {
          this.tableLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.enable-fail'), message.msg);
        }
      },
      error => {
        this.tableLoading = false;
        enableManage$.unsubscribe();
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.enable-fail'), error.msg);
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

  notifyCopySuccess() {
    this.messageSvc.success(this.i18nSvc.fanyi('common.notify.copy-success'), { nzDuration: 800 });
  }

  /**
   * 分页回调
   *
   * @param params 页码信息
   */
  onTablePageChange(params: NzTableQueryParams) {
    const { pageSize, pageIndex, sort, filter } = params;
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
    const currentSort = sort.find(item => item.value !== null);
    const sortField = (currentSort && currentSort.key) || null;
    const sortOrder = (currentSort && currentSort.value) || null;
    this.loadMonitorTable(sortField, sortOrder);
  }
}
