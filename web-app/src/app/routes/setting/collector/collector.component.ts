import { Component, Inject, OnInit } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzTableQueryParams } from 'ng-zorro-antd/table';

import { CollectorSummary } from '../../../pojo/CollectorSummary';
import { CollectorService } from '../../../service/collector.service';

@Component({
  selector: 'app-setting-collector',
  templateUrl: './collector.component.html'
})
export class CollectorComponent implements OnInit {
  constructor(
    private notifySvc: NzNotificationService,
    private modal: NzModalService,
    private collectorService: CollectorService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;
  collectors!: CollectorSummary[];
  tableLoading: boolean = false;
  checkedCollectors = new Set<string>();
  // 搜索过滤相关属性
  search: string | undefined;

  ngOnInit(): void {
    this.loadCollectorsTable();
  }

  sync() {
    this.loadCollectorsTable();
  }

  loadCollectorsTable() {
    this.tableLoading = true;
    let collectorsInit$ = this.collectorService.queryCollectors(this.search, this.pageIndex - 1, this.pageSize).subscribe(
      message => {
        this.tableLoading = false;
        this.checkedAll = false;
        this.checkedCollectors.clear();
        if (message.code === 0) {
          let page = message.data;
          this.collectors = page.content;
          this.pageIndex = page.number + 1;
          this.total = page.totalElements;
        } else {
          console.warn(message.msg);
        }
        collectorsInit$.unsubscribe();
      },
      error => {
        this.tableLoading = false;
        collectorsInit$.unsubscribe();
        console.error(error.msg);
      }
    );
  }

  onDeleteCollectors() {
    if (this.checkedCollectors == null || this.checkedCollectors.size === 0) {
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
      nzOnOk: () => this.deleteCollectors(this.checkedCollectors)
    });
  }

  onGoOnlineCollectors() {
    if (this.checkedCollectors == null || this.checkedCollectors.size === 0) {
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
      nzOnOk: () => this.goOnlineCollectors(this.checkedCollectors)
    });
  }

  onGoOfflineCollectors() {
    if (this.checkedCollectors == null || this.checkedCollectors.size === 0) {
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
      nzOnOk: () => this.goOfflineCollectors(this.checkedCollectors)
    });
  }

  onDeleteOneCollector(collector: string) {
    let collectors = new Set<string>();
    collectors.add(collector);
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.deleteCollectors(collectors)
    });
  }

  onGoOnlineOneCollector(collector: string) {
    let collectors = new Set<string>();
    collectors.add(collector);
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.goOnlineCollectors(collectors)
    });
  }

  onGoOfflineOneCollector(collector: string) {
    let collectors = new Set<string>();
    collectors.add(collector);
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.goOfflineCollectors(collectors)
    });
  }

  deleteCollectors(collectors: Set<string>) {
    this.tableLoading = true;
    const deleteCollectors$ = this.collectorService.deleteCollector(collectors).subscribe(
      message => {
        deleteCollectors$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
          this.loadCollectorsTable();
        } else {
          this.tableLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), message.msg);
        }
      },
      error => {
        this.tableLoading = false;
        deleteCollectors$.unsubscribe();
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), error.msg);
      }
    );
  }

  goOnlineCollectors(collectors: Set<string>) {
    this.tableLoading = true;
    const onlineCollectors$ = this.collectorService.goOnlineCollector(collectors).subscribe(
      message => {
        onlineCollectors$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
          this.loadCollectorsTable();
        } else {
          this.tableLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), message.msg);
        }
      },
      error => {
        this.tableLoading = false;
        onlineCollectors$.unsubscribe();
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), error.msg);
      }
    );
  }

  goOfflineCollectors(collectors: Set<string>) {
    this.tableLoading = true;
    const offlineCollectors$ = this.collectorService.goOfflineCollector(collectors).subscribe(
      message => {
        offlineCollectors$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
          this.loadCollectorsTable();
        } else {
          this.tableLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), message.msg);
        }
      },
      error => {
        this.tableLoading = false;
        offlineCollectors$.unsubscribe();
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), error.msg);
      }
    );
  }

  // begin: 列表多选分页逻辑
  checkedAll: boolean = false;
  onAllChecked(checked: boolean) {
    if (checked) {
      this.collectors.forEach(collector => this.checkedCollectors.add(collector.collector.name));
    } else {
      this.checkedCollectors.clear();
    }
  }
  onItemChecked(collector: string, checked: boolean) {
    if (checked) {
      this.checkedCollectors.add(collector);
    } else {
      this.checkedCollectors.delete(collector);
    }
  }
  onTablePageChange(params: NzTableQueryParams) {
    const { pageSize, pageIndex, sort, filter } = params;
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
    this.loadCollectorsTable();
  }
  // end: 列表多选分页逻辑
}
