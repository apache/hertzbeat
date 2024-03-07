import { Component, Inject, OnInit } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN, SettingsService } from '@delon/theme';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzTableQueryParams } from 'ng-zorro-antd/table';
import { finalize } from 'rxjs/operators';

import { AlertSilence } from '../../../pojo/AlertSilence';
import { TagItem } from '../../../pojo/NoticeRule';
import { AlertSilenceService } from '../../../service/alert-silence.service';
import { TagService } from '../../../service/tag.service';

@Component({
  selector: 'app-alert-silence',
  templateUrl: './alert-silence.component.html',
  styleUrls: ['./alert-silence.component.less']
})
export class AlertSilenceComponent implements OnInit {
  constructor(
    private modal: NzModalService,
    private notifySvc: NzNotificationService,
    private alertSilenceService: AlertSilenceService,
    private settingsSvc: SettingsService,
    private tagService: TagService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;
  search!: string;
  silences!: AlertSilence[];
  tableLoading: boolean = true;
  checkedSilenceIds = new Set<number>();

  ngOnInit(): void {
    this.loadAlertSilenceTable();
  }

  sync() {
    this.loadAlertSilenceTable();
  }

  loadAlertSilenceTable() {
    this.tableLoading = true;
    let alertDefineInit$ = this.alertSilenceService.getAlertSilences(this.search, this.pageIndex - 1, this.pageSize).subscribe(
      message => {
        this.tableLoading = false;
        this.checkedAll = false;
        this.checkedSilenceIds.clear();
        if (message.code === 0) {
          let page = message.data;
          this.silences = page.content;
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

  updateAlertSilence(alertSilence: AlertSilence) {
    this.tableLoading = true;
    const updateDefine$ = this.alertSilenceService
      .editAlertSilence(alertSilence)
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
          this.loadAlertSilenceTable();
          this.tableLoading = false;
        },
        error => {
          this.tableLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.msg);
        }
      );
  }

  onDeleteAlertSilences() {
    if (this.checkedSilenceIds == null || this.checkedSilenceIds.size === 0) {
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
      nzOnOk: () => this.deleteAlertSilences(this.checkedSilenceIds)
    });
  }

  onDeleteOneAlertSilence(id: number) {
    let ids = new Set<number>();
    ids.add(id);
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.deleteAlertSilences(ids)
    });
  }

  deleteAlertSilences(silenceIds: Set<number>) {
    if (silenceIds == null || silenceIds.size == 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-delete'), '');
      return;
    }
    this.tableLoading = true;
    const deleteDefines$ = this.alertSilenceService.deleteAlertSilences(silenceIds).subscribe(
      message => {
        deleteDefines$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
          this.updatePageIndex(silenceIds.size);
          this.loadAlertSilenceTable();
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
      this.silences.forEach(item => this.checkedSilenceIds.add(item.id));
    } else {
      this.checkedSilenceIds.clear();
    }
  }
  onItemChecked(id: number, checked: boolean) {
    if (checked) {
      this.checkedSilenceIds.add(id);
    } else {
      this.checkedSilenceIds.delete(id);
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
    this.loadAlertSilenceTable();
  }
  // end: 列表多选逻辑

  // start 新增修改告警静默 model
  isManageModalVisible = false;
  isManageModalOkLoading = false;
  isManageModalAdd = true;
  silence: AlertSilence = new AlertSilence();
  searchTag!: string;
  tagsOption: any[] = [];
  matchTags: string[] = [];
  silenceDates!: Date[];
  dayCheckOptions = [
    { label: this.i18nSvc.fanyi('common.week.7'), value: 7, checked: true },
    { label: this.i18nSvc.fanyi('common.week.1'), value: 1, checked: true },
    { label: this.i18nSvc.fanyi('common.week.2'), value: 2, checked: true },
    { label: this.i18nSvc.fanyi('common.week.3'), value: 3, checked: true },
    { label: this.i18nSvc.fanyi('common.week.4'), value: 4, checked: true },
    { label: this.i18nSvc.fanyi('common.week.5'), value: 5, checked: true },
    { label: this.i18nSvc.fanyi('common.week.6'), value: 6, checked: true }
  ];

  onNewAlertSilence() {
    this.silence = new AlertSilence();
    let now = new Date();
    now.setHours(now.getHours() + 6);
    this.silenceDates = [new Date(), now];
    this.dayCheckOptions.forEach(item => (item.checked = true));
    this.isManageModalAdd = true;
    this.isManageModalVisible = true;
    this.isManageModalOkLoading = false;
  }
  onManageModalCancel() {
    this.isManageModalVisible = false;
  }

  onEditAlertSilence(silenceId: number) {
    if (silenceId == null) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-edit'), '');
      return;
    }
    this.editAlertSilence(silenceId);
  }

  editAlertSilence(silenceId: number) {
    this.isManageModalAdd = false;
    this.isManageModalVisible = true;
    this.isManageModalOkLoading = false;
    const getSilence$ = this.alertSilenceService
      .getAlertSilence(silenceId)
      .pipe(
        finalize(() => {
          getSilence$.unsubscribe();
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.silence = message.data;
            if (this.silence.type === 0) {
              this.silenceDates = [this.silence.periodStart, this.silence.periodEnd];
            } else {
              this.dayCheckOptions.forEach(item => {
                item.checked = this.silence.days != undefined && this.silence.days.indexOf(item.value) >= 0;
              });
            }
            this.isManageModalVisible = true;
            this.isManageModalAdd = false;
            this.matchTags = [];
            if (this.silence.tags != undefined) {
              this.silence.tags.forEach(item => {
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
    this.silence.tags = [];
    this.matchTags.forEach(tag => {
      let tmp: string[] = tag.split(':');
      let tagItem = new TagItem();
      if (tmp.length == 1) {
        tagItem.name = tmp[0];
        this.silence.tags.push(tagItem);
      } else if (tmp.length == 2) {
        tagItem.name = tmp[0];
        tagItem.value = tmp[1];
        this.silence.tags.push(tagItem);
      }
    });
    if (this.silence.priorities != undefined) {
      this.silence.priorities = this.silence.priorities.filter(item => item != null && item != 9);
    }
    if (this.silence.type === 0) {
      this.silence.periodStart = this.silenceDates[0];
      this.silence.periodEnd = this.silenceDates[1];
    } else {
      this.silence.days = this.dayCheckOptions
        .filter(item => item.checked)
        .map(item => item.value)
        .concat();
    }
    this.isManageModalOkLoading = true;
    if (this.isManageModalAdd) {
      const modalOk$ = this.alertSilenceService
        .newAlertSilence(this.silence)
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
              this.loadAlertSilenceTable();
            } else {
              this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), message.msg);
            }
          },
          error => {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), error.msg);
          }
        );
    } else {
      const modalOk$ = this.alertSilenceService
        .editAlertSilence(this.silence)
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
              this.loadAlertSilenceTable();
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
    if (this.silence.priorities != undefined) {
      let isAll = false;
      this.silence.priorities.forEach(item => {
        if (item == 9) {
          isAll = true;
        }
      });
      if (isAll) {
        this.silence.priorities = [9, 0, 1, 2];
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
