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

import { Component, Inject, OnInit } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzCascaderFilter } from 'ng-zorro-antd/cascader';
import { ModalButtonOptions, NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzTableQueryParams } from 'ng-zorro-antd/table';
import { TransferChange, TransferItem } from 'ng-zorro-antd/transfer';
import { NzUploadChangeParam } from 'ng-zorro-antd/upload';
import { zip } from 'rxjs';
import { finalize, map } from 'rxjs/operators';

import { AlertDefineBind } from '../../pojo/AlertDefineBind';
import { BulletinDefine } from '../../pojo/BulletinDefine';
import { Message } from '../../pojo/Message';
import { Monitor } from '../../pojo/Monitor';
import { Tag } from '../../pojo/Tag';
import { AlertDefineService } from '../../service/alert-define.service';
import { AppDefineService } from '../../service/app-define.service';
import { BulletinDefineService } from '../../service/bulletin-define.service';
import { MonitorService } from '../../service/monitor.service';
import { TagService } from '../../service/tag.service';

const AVAILABILITY = 'availability';

@Component({
  selector: 'app-bulletin',
  templateUrl: './bulletin.component.html',
  styleUrls: ['./bulletin.component.less']
})
export class BulletinComponent implements OnInit {
  constructor(
    private modal: NzModalService,
    private notifySvc: NzNotificationService,
    private appDefineSvc: AppDefineService,
    private monitorSvc: MonitorService,
    private alertDefineSvc: AlertDefineService,
    private bulletinDefineSvc: BulletinDefineService,
    private tagSvc: TagService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}
  search!: string;
  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;
  defines!: BulletinDefine[];
  tableLoading: boolean = true;
  checkedDefineIds = new Set<number>();
  isSwitchExportTypeModalVisible = false;
  isAppListLoading = false;
  appHierarchies!: any[];
  appMap =  new Map<string, string>();
  appEntries: { value: any; key: string }[] = [];
  switchExportTypeModalFooter: ModalButtonOptions[] = [
    { label: this.i18nSvc.fanyi('common.button.cancel'), type: 'default', onClick: () => (this.isSwitchExportTypeModalVisible = false) }
  ];
  ngOnInit(): void {
    this.loadBulletinDefineTable();
    // 查询监控层级
    const getHierarchy$ = this.appDefineSvc
      .getAppHierarchy(this.i18nSvc.defaultLang)
      .pipe(
        finalize(() => {
          getHierarchy$.unsubscribe();
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.appHierarchies = message.data;
            this.appHierarchies.forEach(item => {
              if (item.children == undefined) {
                item.children = [];
              }
              item.children.unshift({
                value: AVAILABILITY,
                label: this.i18nSvc.fanyi('monitor.availability'),
                isLeaf: true
              });
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

  sync() {
    this.loadBulletinDefineTable();
  }

  loadBulletinDefineTable() {
    this.tableLoading = true;
    let bulletinDefineInit$ = this.bulletinDefineSvc.getBulletinDefines(this.search, this.pageIndex - 1, this.pageSize).subscribe(
      message => {
        this.tableLoading = false;
        this.checkedAll = false;
        this.checkedDefineIds.clear();
        if (message.code === 0) {
          let page = message.data;
          this.defines = page.content;
          this.pageIndex = page.number + 1;
          this.total = page.totalElements;
        } else {
          console.warn(message.msg);
        }
        bulletinDefineInit$.unsubscribe();
      },
      error => {
        this.tableLoading = false;
        bulletinDefineInit$.unsubscribe();
      }
    );
  }

  onNewBulletinDefine() {
    this.define = new BulletinDefine();
    this.define.tags = [];
    this.define.metrics = [];
    this.isManageModalAdd = true;
    this.isManageModalVisible = true;
    this.isManageModalOkLoading = false;
  }

  onEditOneBulletinDefine(alertDefineId: number) {
    if (alertDefineId == null) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-edit'), '');
      return;
    }
    this.editBulletinDefine(alertDefineId);
  }

  onEditBulletinDefine() {
    // 编辑时只能选中一个
    if (this.checkedDefineIds == null || this.checkedDefineIds.size === 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-edit'), '');
      return;
    }
    if (this.checkedDefineIds.size > 1) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.one-select-edit'), '');
      return;
    }
    let alertDefineId = 0;
    this.checkedDefineIds.forEach(item => (alertDefineId = item));
    this.editBulletinDefine(alertDefineId);
  }

  updateBulletinDefine(bulletinDefine: BulletinDefine) {
    this.tableLoading = true;
    const updateDefine$ = this.bulletinDefineSvc
      .editBulletinDefine(bulletinDefine)
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
          this.loadBulletinDefineTable();
          this.tableLoading = false;
        },
        error => {
          this.tableLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.msg);
        }
      );
  }

  editBulletinDefine(bulletinDefineId: number) {
    this.isManageModalAdd = false;
    this.isManageModalVisible = true;
    this.isManageModalOkLoading = false;
    // 查询告警定义信息
    const getDefine$ = this.bulletinDefineSvc
      .getBulletinDefine(bulletinDefineId)
      .pipe(
        finalize(() => {
          getDefine$.unsubscribe();
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.define = message.data;
            if (this.define.tags == undefined) {
              this.define.tags = [];
            }
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.monitor-fail'), message.msg);
          }
        },
        error => {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.monitor-fail'), error.msg);
        }
      );
  }

  onDeleteBulletinDefines() {
    if (this.checkedDefineIds == null || this.checkedDefineIds.size === 0) {
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
      nzOnOk: () => this.deleteBulletinDefines(this.checkedDefineIds)
    });
  }

  onDeleteOneBulletinDefine(bulletinDefineId: number) {
    let defineIds = new Set<number>();
    defineIds.add(bulletinDefineId);
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.deleteBulletinDefines(defineIds)
    });
  }

  deleteBulletinDefines(defineIds: Set<number>) {
    if (defineIds == null || defineIds.size == 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-delete'), '');
      return;
    }
    this.tableLoading = true;
    const deleteDefines$ = this.bulletinDefineSvc.deleteBulletinDefines(defineIds).subscribe(
      message => {
        deleteDefines$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
          this.updatePageIndex(defineIds.size);
          this.loadBulletinDefineTable();
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
      this.defines.forEach(monitor => this.checkedDefineIds.add(monitor.id));
    } else {
      this.checkedDefineIds.clear();
    }
  }
  onItemChecked(monitorId: number, checked: boolean) {
    if (checked) {
      this.checkedDefineIds.add(monitorId);
    } else {
      this.checkedDefineIds.delete(monitorId);
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
    this.loadBulletinDefineTable();
  }
  // end: 列表多选逻辑

  // start 新增修改告警定义model
  isManageModalVisible = false;
  isManageModalOkLoading = false;
  isManageModalAdd = true;
  define: BulletinDefine = new BulletinDefine();
  cascadeValues: string[] = [];
  currentMetrics: TransferItem[] = [];
  alertRules: any[] = [{}];
  isExpr = false;
  caseInsensitiveFilter: NzCascaderFilter = (i, p) => {
    return p.some(o => {
      const label = o.label;
      return !!label && label.toLowerCase().indexOf(i.toLowerCase()) !== -1;
    });
  };


  onManageModalCancel() {
    this.isExpr = false;
    this.isManageModalVisible = false;
  }

  resetManageModalData() {
    this.cascadeValues = [];
    this.alertRules = [{}];
    this.isExpr = false;
    this.isManageModalVisible = false;
  }

  onManageModalOk() {
    this.isManageModalOkLoading = true;
    this.define.app = this.cascadeValues[0];
    // this.define.metric = this.cascadeValues[1];
    // if (this.cascadeValues.length == 3) {
    //   this.define.field = this.cascadeValues[2];
    //   if (!this.isExpr) {
    //     let expr = this.calculateAlertRuleExpr();
    //     if (expr != '') {
    //       this.define.expr = expr;
    //     }
    //   }
    // } else {
    //   this.define.expr = '';
    //   this.define.field = '';
    // }
    if (this.isManageModalAdd) {
      const modalOk$ = this.bulletinDefineSvc
        .newBulletinDefine(this.define)
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
              this.loadBulletinDefineTable();
              this.resetManageModalData();
            } else {
              this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), message.msg);
            }
          },
          error => {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), error.msg);
          }
        );
    } else {
      const modalOk$ = this.bulletinDefineSvc
        .editBulletinDefine(this.define)
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
              this.loadBulletinDefineTable();
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

  // end 新增修改告警定义model

  // start Tag model
  isTagManageModalVisible = false;
  isTagManageModalOkLoading = false;
  tagCheckedAll: boolean = false;
  tagTableLoading = false;
  tagSearch!: string;
  tags!: Tag[];
  checkedTags = new Set<Tag>();
  loadTagsTable() {
    this.tagTableLoading = true;
    let tagsReq$ = this.tagSvc.loadTags(this.tagSearch, 1, 0, 1000).subscribe(
      message => {
        this.tagTableLoading = false;
        this.tagCheckedAll = false;
        this.checkedTags.clear();
        if (message.code === 0) {
          let page = message.data;
          this.tags = page.content;
        } else {
          console.warn(message.msg);
        }
        tagsReq$.unsubscribe();
      },
      error => {
        this.tagTableLoading = false;
        tagsReq$.unsubscribe();
      }
    );
  }
  onShowTagsModal() {
    this.isTagManageModalVisible = true;
    this.loadTagsTable();
  }
  onTagManageModalCancel() {
    this.isTagManageModalVisible = false;
  }
  onTagManageModalOk() {
    this.isTagManageModalOkLoading = true;
    this.checkedTags.forEach(item => {
      if (this.define.tags.find(tag => tag.name == item.name && tag.value == item.tagValue) == undefined) {
        this.define.tags.push({ name: item.name, value: item.tagValue });
      }
    });
    this.isTagManageModalOkLoading = false;
    this.isTagManageModalVisible = false;
  }
  onTagAllChecked(checked: boolean) {
    if (checked) {
      this.tags.forEach(tag => this.checkedTags.add(tag));
    } else {
      this.checkedTags.clear();
    }
  }
  onTagItemChecked(tag: Tag, checked: boolean) {
    if (checked) {
      this.checkedTags.add(tag);
    } else {
      this.checkedTags.delete(tag);
    }
  }
  // end tag model

  // start 告警定义与监控关联model
  isConnectModalVisible = false;
  isConnectModalOkLoading = false;
  transferData: TransferItem[] = [];
  currentAlertDefineId!: number;
  $asTransferItems = (data: unknown): TransferItem[] => data as TransferItem[];
  onOpenConnectModal(alertDefineId: number, app: string) {
    this.isConnectModalVisible = true;
    this.currentAlertDefineId = alertDefineId;
    zip(this.alertDefineSvc.getAlertDefineMonitorsBind(alertDefineId), this.monitorSvc.getMonitorsByApp(app))
      .pipe(
        map(([defineBindData, monitorData]: [Message<AlertDefineBind[]>, Message<Monitor[]>]) => {
          let bindRecode: Record<number, string> = {};
          if (defineBindData.data != undefined) {
            defineBindData.data.forEach(bind => {
              bindRecode[bind.monitorId] = bind.monitor.name;
            });
          }
          let listTmp: any[] = [];
          if (monitorData.data != undefined) {
            monitorData.data.forEach(monitor => {
              listTmp.push({
                id: monitor.id,
                name: monitor.name,
                key: monitor.id,
                direction: bindRecode[monitor.id] == undefined ? 'left' : 'right'
              });
            });
          }
          return listTmp;
        })
      )
      .subscribe(list => (this.transferData = list));
  }
  onConnectModalCancel() {
    this.isConnectModalVisible = false;
  }
  onExportTypeModalCancel() {
    this.isSwitchExportTypeModalVisible = false;
  }
  onConnectModalOk() {
    this.isConnectModalOkLoading = true;
    let defineBinds: AlertDefineBind[] = [];
    this.transferData.forEach(item => {
      if (item.direction == 'right') {
        let bind = new AlertDefineBind();
        bind.alertDefineId = this.currentAlertDefineId;
        bind.monitorId = item.id;
        defineBinds.push(bind);
      }
    });
    const applyBind$ = this.alertDefineSvc
      .applyAlertDefineMonitorsBind(this.currentAlertDefineId, defineBinds)
      .pipe(
        finalize(() => {
          applyBind$.unsubscribe();
          this.isConnectModalOkLoading = false;
        })
      )
      .subscribe(
        message => {
          this.isConnectModalOkLoading = false;
          if (message.code === 0) {
            this.notifySvc.success(this.i18nSvc.fanyi('common.notify.apply-success'), '');
            this.isConnectModalVisible = false;
            this.loadBulletinDefineTable();
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.apply-fail'), message.msg);
          }
        },
        error => {
          this.isConnectModalOkLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.apply-fail'), error.msg);
        }
      );
  }
  change(ret: TransferChange): void {
    const listKeys = ret.list.map(l => l.key);
    const hasOwnKey = (e: TransferItem): boolean => e.hasOwnProperty('key');
    this.transferData = this.transferData.map(e => {
      if (listKeys.includes(e.key) && hasOwnKey(e)) {
        if (ret.to === 'left') {
          delete e.hide;
        } else if (ret.to === 'right') {
          e.hide = false;
        }
      }
      return e;
    });
  }
  filterMetrics(currentMetrics: any[], cascadeValues: any): any[] {
    if (cascadeValues.length !== 3) {
      return currentMetrics;
    }
    // sort the cascadeValues[2] to first
    return currentMetrics.sort((a, b) => {
      if (a.value !== cascadeValues[2]) {
        return 1;
      } else {
        return -1;
      }
    });
  }
  // end 告警定义与监控关联model

  // SearchAppDefines
  onSearchAppDefines(): void {
    this.appDefineSvc.getAppDefines(this.i18nSvc.defaultLang).pipe().subscribe(
      message => {
        if (message.code === 0) {
          this.appMap = message.data;
          this.appEntries = Object.entries(this.appMap).map(([key, value]) => ({ key, value }));
          if (this.appEntries != null) {
            this.isAppListLoading = true;
          }
        } else {
          console.warn(message.msg);
        }
      },
      error => {
        console.warn(error.msg);
      }
    )
  }

  onAppChange(appKey: string): void {
    if (appKey) {
      this.onSearchMetricsByApp(appKey);
    } else {
      this.currentMetrics = [];
    }
  }

  onSearchMetricsByApp(app: string): void {
    this.monitorSvc.getMonitorByApp(app).pipe().subscribe(
      message => {
        if (message.code === 0) {
          if (message.data != null && message.data.length > 0) {
          this.currentMetrics = message.data.map((metric: any) => ({
            key: metric,
            title: metric,
            description: metric,
            direction: 'left'
          }));}
        } else {
          console.warn(message.msg);
        }
      },
      error => {
        console.warn(error.msg);
      }
    )
  }
}
