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

import { ChangeDetectorRef, Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzTableQueryParams } from 'ng-zorro-antd/table';
import { TransferChange } from 'ng-zorro-antd/transfer';
import { NzFormatEmitEvent, NzTreeNode, NzTreeNodeOptions } from 'ng-zorro-antd/tree';
import { finalize } from 'rxjs/operators';

import { BulletinDefine } from '../../pojo/BulletinDefine';
import { Fields } from '../../pojo/Fields';
import { Monitor } from '../../pojo/Monitor';
import { AppDefineService } from '../../service/app-define.service';
import { BulletinDefineService } from '../../service/bulletin-define.service';
import { MonitorService } from '../../service/monitor.service';

@Component({
  selector: 'app-bulletin',
  templateUrl: './bulletin.component.html',
  styleUrls: ['./bulletin.component.less']
})
export class BulletinComponent implements OnInit, OnDestroy {
  constructor(
    private modal: NzModalService,
    private notifySvc: NzNotificationService,
    private appDefineSvc: AppDefineService,
    private monitorSvc: MonitorService,
    private bulletinDefineSvc: BulletinDefineService,
    private cdr: ChangeDetectorRef,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}
  search!: string;
  bulletins!: BulletinDefine[];
  currentTab: number = 0;
  currentBulletin!: BulletinDefine;
  metricsData!: any;
  tableLoading: boolean = true;
  deleteBulletinIds: number[] = [];
  isAppListLoading = false;
  isMonitorListLoading = false;
  treeNodes!: NzTreeNodeOptions[];
  hierarchies: NzTreeNodeOptions[] = [];
  appMap = new Map<string, string>();
  appEntries: Array<{ value: any; key: string }> = [];
  checkedNodeList: NzTreeNode[] = [];
  monitors: Monitor[] = [];
  metrics = new Set<string>();
  tempMetrics = new Set<string>();
  fields: Fields = {};
  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;
  refreshInterval: any;
  deadline = 30;
  countDownTime: number = 0;

  ngOnInit() {
    this.loadTabs();
    this.refreshInterval = setInterval(() => {
      this.countDown();
    }, 1000); // every 30 seconds refresh the tabs
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  sync() {
    this.loadCurrentBulletinData();
  }

  configRefreshDeadline(deadlineTime: number) {
    this.deadline = deadlineTime;
    this.countDownTime = this.deadline;
    this.cdr.detectChanges();
  }

  countDown() {
    if (this.deadline > 0) {
      this.countDownTime = Math.max(0, this.countDownTime - 1);
      this.cdr.detectChanges();
      if (this.countDownTime == 0) {
        this.loadCurrentBulletinData();
        this.countDownTime = this.deadline;
        this.cdr.detectChanges();
      }
    }
  }

  onNewBulletinDefine() {
    this.resetManageModalData();
    this.isManageModalAdd = true;
    this.isManageModalVisible = true;
    this.isManageModalOkLoading = false;
  }

  onEditBulletinDefine() {
    if (this.currentBulletin) {
      this.define = this.currentBulletin;
      this.onAppChange(this.define.app);
      // this.tempMetrics.add(...this.define.fields.keys());
      this.isManageModalAdd = false;
      this.isManageModalVisible = true;
      this.isManageModalOkLoading = false;
    }
  }

  deleteBulletinDefines(defineIds: number[]) {
    if (defineIds == null || defineIds.length == 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-delete'), '');
      return;
    }
    const deleteDefines$ = this.bulletinDefineSvc.deleteBulletinDefines(defineIds).subscribe(
      message => {
        deleteDefines$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
          this.loadTabs();
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), message.msg);
        }
      },
      error => {
        deleteDefines$.unsubscribe();
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), error.msg);
      }
    );
  }

  isManageModalVisible = false;
  isManageModalOkLoading = false;
  isManageModalAdd = true;
  define: BulletinDefine = new BulletinDefine();

  onManageModalCancel() {
    this.isManageModalVisible = false;
    // clear fields
    this.fields = {};
  }

  resetManageModalData() {
    this.define = new BulletinDefine();
    this.define.monitorIds = [];
    this.hierarchies = [];
    this.treeNodes = [];
    // clear fields
    this.fields = {};
  }

  onManageModalOk() {
    this.isManageModalOkLoading = true;
    this.define.fields = this.fields;
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
              this.notifySvc.success(this.i18nSvc.fanyi('common.notify.new-success'), '');
              this.isManageModalVisible = false;
              // clear fields
              this.fields = {};
              this.resetManageModalData();
              this.loadTabs();
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
              this.loadTabs();
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

  onSearchAppDefines(): void {
    this.appDefineSvc
      .getAppDefines(this.i18nSvc.defaultLang)
      .pipe()
      .subscribe(
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
      );
  }

  onSearchMonitorsByApp(app: string): void {
    this.monitorSvc
      .getMonitorsByApp(app)
      .pipe()
      .subscribe(
        message => {
          if (message.code === 0) {
            this.monitors = message.data;
            if (this.monitors != null) {
              this.isMonitorListLoading = true;
            }
          } else {
            console.warn(message.msg);
          }
        },
        error => {
          console.warn(error.msg);
        }
      );
  }

  onAppChange(app: string): void {
    if (app) {
      this.onSearchMonitorsByApp(app);
      this.onSearchTreeNodes(app);
    } else {
      this.hierarchies = [];
      this.treeNodes = [];
    }
  }

  onSearchTreeNodes(app: string): void {
    this.appDefineSvc
      .getAppHierarchyByName(this.i18nSvc.defaultLang, app)
      .pipe()
      .subscribe(
        message => {
          if (message.code === 0) {
            this.hierarchies = this.transformToTransferItems(message.data);
            this.treeNodes = this.generateTree(this.hierarchies);
          } else {
            console.warn(message.msg);
          }
        },
        error => {
          console.warn(error.msg);
        }
      );
  }

  transformToTransferItems(data: any[]): NzTreeNodeOptions[] {
    const result: NzTreeNodeOptions[] = [];
    let currentId = 1;

    const traverse = (nodes: any[], parentKey: string | null = null, parentId: number | null = null) => {
      nodes.forEach(node => {
        const key = parentKey ? `${parentKey}` : node.value;
        const isRootNode = parentId === null;
        const item: NzTreeNodeOptions = {
          id: currentId++,
          key,
          value: node.value,
          title: node.label,
          isLeaf: node.isLeaf,
          parentId,
          disabled: isRootNode
        };
        result.push(item);

        if (node.children) {
          traverse(node.children, key, item.id);
        }
      });
    };

    if (data[0] && data[0].children) {
      data = data[0].children;
      traverse(data);
    }

    return result;
  }

  private generateTree(arr: NzTreeNodeOptions[]): NzTreeNodeOptions[] {
    const tree: NzTreeNodeOptions[] = [];
    const treeNodes: any = {};
    let leftElem: NzTreeNodeOptions;
    let rightElem: NzTreeNodeOptions;

    for (let i = 0, len = arr.length; i < len; i++) {
      leftElem = arr[i];
      treeNodes[leftElem.id] = { ...leftElem };
      treeNodes[leftElem.id].children = [];
    }

    for (const id in treeNodes) {
      if (treeNodes.hasOwnProperty(id)) {
        rightElem = treeNodes[id];
        if (rightElem.parentId) {
          treeNodes[rightElem.parentId].children.push(rightElem);
        } else {
          tree.push(rightElem);
        }
      }
    }
    return tree;
  }

  treeCheckBoxChange(event: NzFormatEmitEvent, onItemSelect: (item: NzTreeNodeOptions) => void): void {
    this.checkBoxChange(event.node!, onItemSelect);
  }

  checkBoxChange(node: NzTreeNode, onItemSelect: (item: NzTreeNodeOptions) => void): void {
    if (node.isDisabled) {
      return;
    }

    if (node.isChecked) {
      this.checkedNodeList.push(node);
    } else {
      const idx = this.checkedNodeList.indexOf(node);
      if (idx !== -1) {
        this.checkedNodeList.splice(idx, 1);
      }
    }
    const item = this.hierarchies.find(w => w.id === node.origin.id);
    onItemSelect(item!);
  }

  transferChange(ret: TransferChange): void {
    // add
    if (ret.to === 'right') {
      ret.list.forEach(node => {
        node.isDisabled = true;
        node.isChecked = true;
        this.tempMetrics.add(node.key);

        if (!this.fields[node.key]) {
          this.fields[node.key] = [];
        }
        if (!this.fields[node.key].includes(node.value)) {
          this.fields[node.key].push(node.value);
        }
      });
    }
    // delete
    else if (ret.to === 'left') {
      ret.list.forEach(node => {
        node.isDisabled = false;
        node.isChecked = false;
        this.tempMetrics.delete(node.key);

        if (this.fields[node.key]) {
          const index = this.fields[node.key].indexOf(node.value);
          if (index > -1) {
            this.fields[node.key].splice(index, 1);
          }
          // 如果该 key 下的数组为空，则删除该 key
          if (this.fields[node.key].length === 0) {
            delete this.fields[node.key];
          }
        }
      });
    }
  }

  loadTabs() {
    const allNames$ = this.bulletinDefineSvc.queryBulletins().subscribe(
      message => {
        allNames$.unsubscribe();
        if (message.code === 0) {
          let page = message.data;
          this.bulletins = page.content;
          this.pageIndex = page.number + 1;
          this.total = page.totalElements;
          if (this.bulletins != null) {
            if (this.currentTab >= this.bulletins.length) {
              this.currentTab = 0;
            }
            this.currentBulletin = this.bulletins[this.currentTab];
            this.loadCurrentBulletinData();
          }
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.get-fail'), message.msg);
        }
      },
      error => {
        allNames$.unsubscribe();
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.get-fail'), error.msg);
      }
    );
  }

  loadCurrentBulletinData() {
    this.tableLoading = true;
    this.metricsData = [];
    this.metrics = new Set<string>();
    if (this.currentBulletin == null || this.currentBulletin.id == null) {
      return;
    }
    const metricData$ = this.bulletinDefineSvc.getMonitorMetricsData(this.currentBulletin?.id).subscribe(
      message => {
        metricData$.unsubscribe();
        if (message.code === 0 && message.data) {
          (this.metricsData = message.data.content).forEach((item: any) => {
            item.metrics.forEach((metric: any) => {
              this.metrics.add(metric.name);
            });
          });
        } else if (message.code !== 0) {
          this.notifySvc.warning(`${message.msg}`, '');
          console.info(`${message.msg}`);
        }
        this.tableLoading = false;
      },
      error => {
        console.error(error.msg);
        metricData$.unsubscribe();
        this.tableLoading = false;
      }
    );
  }

  getKeys(metricName: string): string[] {
    const result = new Set<string>();
    this.metricsData.forEach((item: any) => {
      item.metrics.forEach((metric: any) => {
        if (metric.name === metricName) {
          metric.fields.forEach((fieldGroup: any) => {
            fieldGroup.forEach((field: any) => {
              result.add(field.key);
            });
          });
        }
      });
    });
    return Array.from(result);
  }

  onTablePageChange(params: NzTableQueryParams): void {
    const { pageSize, pageIndex } = params;

    if (pageIndex !== this.pageIndex || pageSize !== this.pageSize) {
      this.pageIndex = pageIndex;
      this.pageSize = pageSize;
      this.loadTabs();
    }
  }

  isBatchDeleteModalVisible: boolean = false;
  isBatchDeleteModalOkLoading: boolean = false;

  onDeleteBulletinDefines() {
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.deleteBulletinDefines([this.currentBulletin.id])
    });
  }

  onBatchDeleteBulletinDefines() {
    this.isBatchDeleteModalVisible = true;
  }

  onBatchDeleteModalCancel() {
    this.isBatchDeleteModalVisible = false;
  }

  onBatchDeleteModalOk() {
    this.deleteBulletinDefines(this.deleteBulletinIds);
    this.isBatchDeleteModalOkLoading = false;
    this.isBatchDeleteModalVisible = false;
  }

  protected readonly Array = Array;

  onTabChange($event: number) {
    this.currentTab = $event;
    this.currentBulletin = this.bulletins[this.currentTab];
    this.metricsData = [];
    this.loadTabs();
    this.countDownTime = this.deadline;
    this.cdr.detectChanges();
  }
}
