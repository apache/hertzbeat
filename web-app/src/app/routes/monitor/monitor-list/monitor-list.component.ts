/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN, MenuService } from '@delon/theme';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ModalButtonOptions } from 'ng-zorro-antd/modal/modal-types';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzTableQueryParams } from 'ng-zorro-antd/table';
import { NzUploadChangeParam } from 'ng-zorro-antd/upload';
import { finalize } from 'rxjs/operators';

import { Monitor } from '../../../pojo/Monitor';
import { AppDefineService } from '../../../service/app-define.service';
import { MemoryStorageService } from '../../../service/memory-storage.service';
import { MonitorService } from '../../../service/monitor.service';
import { findDeepestSelected } from '../../../shared/utils/common-util';

@Component({
  selector: 'app-monitor-list',
  templateUrl: './monitor-list.component.html',
  styleUrls: ['./monitor-list.component.less']
})
export class MonitorListComponent implements OnInit, OnDestroy {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private modal: NzModalService,
    private notifySvc: NzNotificationService,
    private monitorSvc: MonitorService,
    private storageSvc: MemoryStorageService,
    private appDefineSvc: AppDefineService,
    private menuService: MenuService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  isDefaultListMenu!: boolean;
  app!: string | undefined;
  labels!: string | undefined;
  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;
  monitors!: Monitor[];
  tableLoading: boolean = true;
  checkedMonitorIds = new Set<number>();
  isSwitchExportTypeModalVisible = false;
  exportJsonButtonLoading = false;
  exportExcelButtonLoading = false;
  filterContent!: string;
  filterStatus: number = 9;
  // app type search filter
  appSwitchModalVisible = false;
  appSwitchModalVisibleType = 0;
  appSearchOrigin: any[] = [];
  appSearchLoading = false;
  intervalId: any;

  switchExportTypeModalFooter: ModalButtonOptions[] = [
    { label: this.i18nSvc.fanyi('common.button.cancel'), type: 'default', onClick: () => (this.isSwitchExportTypeModalVisible = false) }
  ];

  ngOnInit(): void {
    this.menuService.change.subscribe(menus => {
      this.isDefaultListMenu = findDeepestSelected(menus).link === '/monitors';
    });
    this.route.queryParamMap.subscribe(paramMap => {
      let appStr = paramMap.get('app');
      let labelsStr = paramMap.get('labels');
      if (labelsStr != null) {
        this.labels = labelsStr;
      } else {
        this.labels = undefined;
      }
      if (appStr != null) {
        this.app = appStr;
      } else {
        this.app = undefined;
      }
      this.pageIndex = 1;
      this.pageSize = 8;
      this.checkedMonitorIds = new Set<number>();
      this.tableLoading = true;
      this.loadMonitorTable();
    });
    // Set up an interval to refresh the table every 2 minutes
    this.intervalId = setInterval(() => {
      this.sync();
    }, 120000); // 120000 ms = 2 minutes
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  onAppChanged(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...this.route.snapshot.queryParams, app: this.app },
      queryParamsHandling: 'merge'
    });
  }

  onFilterSearchMonitors() {
    this.tableLoading = true;
    this.pageIndex = 1;
    let filter$ = this.monitorSvc
      .searchMonitors(this.app, this.labels, this.filterContent, this.filterStatus, this.pageIndex - 1, this.pageSize)
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

  getAppIconName(app: string | undefined): string {
    let hierarchy: any[] = this.storageSvc.getData('hierarchy');
    let find = hierarchy.find((item: { category: string; value: string }) => {
      return item.value == app;
    });
    if (find == undefined) {
      return this.i18nSvc.fanyi('monitor.icon.center');
    }
    let icon = this.i18nSvc.fanyi(`monitor.icon.${find.category}`);
    if (icon == `monitor.icon.${find.category}`) {
      return this.i18nSvc.fanyi('monitor.icon.center');
    }
    return icon;
  }

  loadMonitorTable(sortField?: string | null, sortOrder?: string | null) {
    this.tableLoading = true;
    let monitorInit$ = this.monitorSvc
      .searchMonitors(this.app, this.labels, this.filterContent, this.filterStatus, this.pageIndex - 1, this.pageSize, sortField, sortOrder)
      .subscribe(
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
  changeMonitorTable(sortField?: string | null, sortOrder?: string | null) {
    this.tableLoading = true;
    let monitorInit$ = this.monitorSvc
      .searchMonitors(this.app, this.labels, this.filterContent, this.filterStatus, this.pageIndex - 1, this.pageSize, sortField, sortOrder)
      .subscribe(
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

  onExportMonitors() {
    if (this.checkedMonitorIds == null || this.checkedMonitorIds.size == 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-export'), '');
      return;
    }
    this.isSwitchExportTypeModalVisible = true;
  }

  onImportMonitors(info: NzUploadChangeParam): void {
    if (info.file.response) {
      this.tableLoading = true;
      const message = info.file.response;
      if (message.code === 0) {
        this.notifySvc.success(this.i18nSvc.fanyi('common.notify.import-success'), '');
        this.loadMonitorTable();
      } else {
        this.tableLoading = false;
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.import-fail'), message.msg);
      }
    }
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
          this.updatePageIndex(monitors.size);
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
    // delete grafana dashboard
    for (let monitorId of monitors) {
      this.deleteGrafanaDashboard(monitorId);
    }
  }

  updatePageIndex(delSize: number) {
    const lastPage = Math.max(1, Math.ceil((this.total - delSize) / this.pageSize));
    this.pageIndex = this.pageIndex > lastPage ? lastPage : this.pageIndex;
  }

  exportMonitors(type: string) {
    if (this.checkedMonitorIds == null || this.checkedMonitorIds.size == 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-export'), '');
      return;
    }
    switch (type) {
      case 'JSON':
        this.exportJsonButtonLoading = true;
        break;
      case 'EXCEL':
        this.exportExcelButtonLoading = true;
        break;
    }
    const exportMonitors$ = this.monitorSvc
      .exportMonitors(this.checkedMonitorIds, type)
      .pipe(
        finalize(() => {
          this.exportExcelButtonLoading = false;
          this.exportJsonButtonLoading = false;
          exportMonitors$.unsubscribe();
        })
      )
      .subscribe(
        response => {
          const message = response.body!;
          if (message.type == 'application/json') {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.export-fail'), '');
          } else {
            const blob = new Blob([message], { type: response.headers.get('Content-Type')! });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.download = response.headers.get('Content-Disposition')!.split(';')[1].split('filename=')[1];
            a.href = url;
            a.click();
            window.URL.revokeObjectURL(url);
            this.isSwitchExportTypeModalVisible = false;
          }
        },
        error => {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.export-fail'), error.msg);
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

  // begin: List multiple choice paging
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

  // end: List multiple choice paging

  notifyCopySuccess() {
    this.notifySvc.success(this.i18nSvc.fanyi('common.notify.copy-success'), '');
  }

  /**
   * Paging callback
   *
   * @param params page info
   */
  onTablePageChange(params: NzTableQueryParams) {
    const { pageSize, pageIndex, sort, filter } = params;
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
    const currentSort = sort.find(item => item.value !== null);
    const sortField = (currentSort && currentSort.key) || null;
    const sortOrder = (currentSort && currentSort.value) || null;
    this.changeMonitorTable(sortField, sortOrder);
  }

  // begin: app type search filter

  onSearchAppClicked() {
    this.appSwitchModalVisibleType = 1;
    this.onAppSwitchModalOpen();
  }

  onAppSwitchModalOpen() {
    this.appSwitchModalVisible = true;
    this.appSearchLoading = true;
    const getHierarchy$ = this.appDefineSvc
      .getAppHierarchy(this.i18nSvc.defaultLang)
      .pipe(
        finalize(() => {
          getHierarchy$.unsubscribe();
          this.appSearchLoading = false;
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            let appMenus: Record<string, any> = {};
            message.data.forEach((app: any) => {
              let menus = appMenus[app.category];
              app.categoryLabel = this.i18nSvc.fanyi(`menu.monitor.${app.category}`);
              if (app.categoryLabel == `menu.monitor.${app.category}`) {
                app.categoryLabel = app.category.toUpperCase();
              }
              if (menus == undefined) {
                menus = { label: app.categoryLabel, child: [app] };
              } else {
                menus.child.push(app);
              }
              appMenus[app.category] = menus;
            });
            this.appSearchOrigin = Object.entries(appMenus);
            this.appSearchOrigin.sort((a, b) => {
              return b[1].length - a[1].length;
            });
          } else {
            console.warn(message.msg);
          }
        },
        error => {
          console.warn(error.msg);
        }
      );
  }

  onAppSwitchModalCancel() {
    this.appSwitchModalVisible = false;
    this.appSwitchModalVisibleType = 0;
  }

  gotoMonitorAddDetail(app: string) {
    if (this.appSwitchModalVisibleType === 1) {
      this.app = app;
      this.onAppChanged();
      this.onAppSwitchModalCancel();
    } else {
      this.router.navigateByUrl(`/monitors/new?app=${app}`);
    }
  }

  // end: app type search filter

  deleteGrafanaDashboard(monitorId: number) {
    this.monitorSvc.deleteGrafanaDashboard(monitorId).subscribe(
      message => {
        if (message.code === 0) {
          console.log('delete grafana dashboard success');
        } else {
          console.warn(message.msg);
        }
      },
      error => {
        console.error(error.msg);
      }
    );
  }

  getLabelColor(key: string): string {
    const colors = ['blue', 'green', 'orange', 'purple', 'cyan'];
    const index = Math.abs(this.hashString(key)) % colors.length;
    return colors[index];
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  }

  copyMonitor() {
    if (this.checkedMonitorIds == null || this.checkedMonitorIds.size === 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-delete'), '');
      return;
    }
    if (this.checkedMonitorIds.size > 1) {
      this.notifySvc.warning(this.i18nSvc.fanyi('monitor.copy.notify.one-select'), '');
      return;
    }
    const monitorId = Array.from(this.checkedMonitorIds)[0];

    this.monitorSvc.copyMonitor(monitorId).subscribe(
      message => {
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('monitor.copy.success'), '');
          this.loadMonitorTable();
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('monitor.copy.failed'), message.msg);
        }
      },
      error => {
        this.notifySvc.error(this.i18nSvc.fanyi('monitor.copy.failed'), error.msg);
      }
    );
  }
}
