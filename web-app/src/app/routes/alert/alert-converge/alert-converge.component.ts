import { Component, Inject, OnInit } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN, SettingsService } from '@delon/theme';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzTableQueryParams } from 'ng-zorro-antd/table';
import { finalize } from 'rxjs/operators';

import { AlertConverge } from '../../../pojo/AlertConverge';
import { TagItem } from '../../../pojo/NoticeRule';
import { AlertConvergeService } from '../../../service/alert-converge.service';
import { TagService } from '../../../service/tag.service';

@Component({
  selector: 'app-alert-converge',
  templateUrl: './alert-converge.component.html',
  styleUrls: ['./alert-converge.component.less']
})
export class AlertConvergeComponent implements OnInit {
  constructor(
    private modal: NzModalService,
    private notifySvc: NzNotificationService,
    private alertConvergeService: AlertConvergeService,
    private settingsSvc: SettingsService,
    private tagService: TagService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;
  search!: string;
  converges!: AlertConverge[];
  tableLoading: boolean = true;
  checkedConvergeIds = new Set<number>();

  ngOnInit(): void {
    this.loadAlertConvergeTable();
  }

  sync() {
    this.loadAlertConvergeTable();
  }

  loadAlertConvergeTable() {
    this.tableLoading = true;
    let alertDefineInit$ = this.alertConvergeService.getAlertConverges(this.search, this.pageIndex - 1, this.pageSize).subscribe(
      message => {
        this.tableLoading = false;
        this.checkedAll = false;
        this.checkedConvergeIds.clear();
        if (message.code === 0) {
          let page = message.data;
          this.converges = page.content;
          this.pageIndex = page.number + 1;
          this.total = page.totalElements;
        } else {
          console.warn(message.msg);
        }
        alertDefineInit$.unsubscribe();
      },
      error => {
        this.tableLoading = false;
        alertDefineInit$.unsubscribe();
      }
    );
  }

  updateAlertConverge(alertConverge: AlertConverge) {
    this.tableLoading = true;
    const updateDefine$ = this.alertConvergeService
      .editAlertConverge(alertConverge)
      .pipe(
        finalize(() => {
          updateDefine$.unsubscribe();
          this.tableLoading = false;
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.notifySvc.success(this.i18nSvc.fanyi('common.notify.edit-success'), '');
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), message.msg);
          }
          this.loadAlertConvergeTable();
          this.tableLoading = false;
        },
        error => {
          this.tableLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.msg);
        }
      );
  }

  onDeleteAlertConverges() {
    if (this.checkedConvergeIds == null || this.checkedConvergeIds.size === 0) {
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
      nzOnOk: () => this.deleteAlertConverges(this.checkedConvergeIds)
    });
  }

  onDeleteOneAlertConverge(id: number) {
    let ids = new Set<number>();
    ids.add(id);
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.deleteAlertConverges(ids)
    });
  }

  deleteAlertConverges(convergeIds: Set<number>) {
    if (convergeIds == null || convergeIds.size == 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-delete'), '');
      return;
    }
    this.tableLoading = true;
    const deleteDefines$ = this.alertConvergeService.deleteAlertConverges(convergeIds).subscribe(
      message => {
        deleteDefines$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
          this.updatePageIndex(convergeIds.size);
          this.loadAlertConvergeTable();
        } else {
          this.tableLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), message.msg);
        }
      },
      error => {
        this.tableLoading = false;
        deleteDefines$.unsubscribe();
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), error.msg);
      }
    );
  }

  updatePageIndex(delSize: number) {
    const lastPage = Math.max(1, Math.ceil((this.total - delSize) / this.pageSize));
    this.pageIndex = this.pageIndex > lastPage ? lastPage : this.pageIndex;
  }

  // begin: 列表多选分页逻辑
  checkedAll: boolean = false;
  onAllChecked(checked: boolean) {
    if (checked) {
      this.converges.forEach(item => this.checkedConvergeIds.add(item.id));
    } else {
      this.checkedConvergeIds.clear();
    }
  }
  onItemChecked(id: number, checked: boolean) {
    if (checked) {
      this.checkedConvergeIds.add(id);
    } else {
      this.checkedConvergeIds.delete(id);
    }
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
    this.loadAlertConvergeTable();
  }
  // end: 列表多选逻辑

  // start 新增修改告警静默 model
  isManageModalVisible = false;
  isManageModalOkLoading = false;
  isManageModalAdd = true;
  converge: AlertConverge = new AlertConverge();
  searchTag!: string;
  tagsOption: any[] = [];
  matchTags: string[] = [];
  convergeDates!: Date[];
  dayCheckOptions = [
    { label: this.i18nSvc.fanyi('common.week.7'), value: 7, checked: true },
    { label: this.i18nSvc.fanyi('common.week.1'), value: 1, checked: true },
    { label: this.i18nSvc.fanyi('common.week.2'), value: 2, checked: true },
    { label: this.i18nSvc.fanyi('common.week.3'), value: 3, checked: true },
    { label: this.i18nSvc.fanyi('common.week.4'), value: 4, checked: true },
    { label: this.i18nSvc.fanyi('common.week.5'), value: 5, checked: true },
    { label: this.i18nSvc.fanyi('common.week.6'), value: 6, checked: true }
  ];

  onNewAlertConverge() {
    this.converge = new AlertConverge();
    let now = new Date();
    now.setHours(now.getHours() + 6);
    this.convergeDates = [new Date(), now];
    this.isManageModalAdd = true;
    this.isManageModalVisible = true;
    this.isManageModalOkLoading = false;
  }
  onManageModalCancel() {
    this.isManageModalVisible = false;
  }

  onEditAlertConverge(convergeId: number) {
    if (convergeId == null) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-edit'), '');
      return;
    }
    this.editAlertConverge(convergeId);
  }

  editAlertConverge(convergeId: number) {
    this.isManageModalAdd = false;
    this.isManageModalVisible = true;
    this.isManageModalOkLoading = false;
    const getConverge$ = this.alertConvergeService
      .getAlertConverge(convergeId)
      .pipe(
        finalize(() => {
          getConverge$.unsubscribe();
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.converge = message.data;
            this.isManageModalVisible = true;
            this.isManageModalAdd = false;
            this.matchTags = [];
            if (this.converge.tags != undefined) {
              this.converge.tags.forEach(item => {
                let tag = `${item.name}`;
                if (item.value != undefined) {
                  tag = `${tag}:${item.value}`;
                }
                this.matchTags.push(tag);
                this.tagsOption.push({
                  value: tag,
                  label: tag
                });
              });
            }
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), message.msg);
          }
        },
        error => {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.msg);
        }
      );
  }
  onManageModalOk() {
    this.converge.tags = [];
    this.matchTags.forEach(tag => {
      let tmp: string[] = tag.split(':');
      let tagItem = new TagItem();
      if (tmp.length == 1) {
        tagItem.name = tmp[0];
        this.converge.tags.push(tagItem);
      } else if (tmp.length == 2) {
        tagItem.name = tmp[0];
        tagItem.value = tmp[1];
        this.converge.tags.push(tagItem);
      }
    });
    if (this.converge.priorities != undefined) {
      this.converge.priorities = this.converge.priorities.filter(item => item != null && item != 9);
    }
    this.isManageModalOkLoading = true;
    if (this.isManageModalAdd) {
      const modalOk$ = this.alertConvergeService
        .newAlertConverge(this.converge)
        .pipe(
          finalize(() => {
            modalOk$.unsubscribe();
            this.isManageModalOkLoading = false;
          })
        )
        .subscribe(
          message => {
            if (message.code === 0) {
              this.isManageModalVisible = false;
              this.notifySvc.success(this.i18nSvc.fanyi('common.notify.new-success'), '');
              this.loadAlertConvergeTable();
            } else {
              this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), message.msg);
            }
          },
          error => {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), error.msg);
          }
        );
    } else {
      const modalOk$ = this.alertConvergeService
        .editAlertConverge(this.converge)
        .pipe(
          finalize(() => {
            modalOk$.unsubscribe();
            this.isManageModalOkLoading = false;
          })
        )
        .subscribe(
          message => {
            if (message.code === 0) {
              this.isManageModalVisible = false;
              this.notifySvc.success(this.i18nSvc.fanyi('common.notify.edit-success'), '');
              this.loadAlertConvergeTable();
            } else {
              this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), message.msg);
            }
          },
          error => {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.msg);
          }
        );
    }
  }

  onPrioritiesChange() {
    if (this.converge.priorities != undefined) {
      let isAll = false;
      this.converge.priorities.forEach(item => {
        if (item == 9) {
          isAll = true;
        }
      });
      if (isAll) {
        this.converge.priorities = [9, 0, 1, 2];
      }
    }
  }

  loadTagsOption() {
    let tagsInit$ = this.tagService.loadTags(this.searchTag, undefined, 0, 1000).subscribe(
      message => {
        if (message.code === 0) {
          let page = message.data;
          this.tagsOption = [];
          if (page.content != undefined) {
            page.content.forEach(item => {
              let tag = `${item.name}`;
              if (item.value != undefined) {
                tag = `${tag}:${item.value}`;
              }
              this.tagsOption.push({
                value: tag,
                label: tag
              });
            });
          }
        } else {
          console.warn(message.msg);
        }
        tagsInit$.unsubscribe();
      },
      error => {
        tagsInit$.unsubscribe();
        console.error(error.msg);
      }
    );
  }

  sliceTagName(tag: any): string {
    if (tag.value != undefined && tag.value.trim() != '') {
      return `${tag.name}:${tag.value}`;
    } else {
      return tag.name;
    }
  }
}
