import { Component, Inject, OnInit } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN, SettingsService } from '@delon/theme';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzTableQueryParams } from 'ng-zorro-antd/table';
import { TransferChange, TransferItem } from 'ng-zorro-antd/transfer';
import { zip } from 'rxjs';
import { finalize, map } from 'rxjs/operators';

import { AlertDefine } from '../../../pojo/AlertDefine';
import { AlertDefineBind } from '../../../pojo/AlertDefineBind';
import { Message } from '../../../pojo/Message';
import { Monitor } from '../../../pojo/Monitor';
import { TagItem } from '../../../pojo/NoticeRule';
import { Tag } from '../../../pojo/Tag';
import { AlertDefineService } from '../../../service/alert-define.service';
import { AppDefineService } from '../../../service/app-define.service';
import { MonitorService } from '../../../service/monitor.service';
import { TagService } from '../../../service/tag.service';

const AVAILABILITY = 'availability';

@Component({
  selector: 'app-alert-setting',
  templateUrl: './alert-setting.component.html',
  styles: []
})
export class AlertSettingComponent implements OnInit {
  constructor(
    private modal: NzModalService,
    private notifySvc: NzNotificationService,
    private appDefineSvc: AppDefineService,
    private monitorSvc: MonitorService,
    private alertDefineSvc: AlertDefineService,
    private settingsSvc: SettingsService,
    private tagSvc: TagService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}
  search!: string;
  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;
  defines!: AlertDefine[];
  tableLoading: boolean = true;
  checkedDefineIds = new Set<number>();

  appHierarchies!: any[];
  ngOnInit(): void {
    this.loadAlertDefineTable();
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
    this.loadAlertDefineTable();
  }

  loadAlertDefineTable() {
    this.tableLoading = true;
    let alertDefineInit$ = this.alertDefineSvc.getAlertDefines(this.search, this.pageIndex - 1, this.pageSize).subscribe(
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
        alertDefineInit$.unsubscribe();
      },
      error => {
        this.tableLoading = false;
        alertDefineInit$.unsubscribe();
      }
    );
  }

  onNewAlertDefine() {
    this.define = new AlertDefine();
    this.define.tags = [];
    this.isManageModalAdd = true;
    this.isManageModalVisible = true;
    this.isManageModalOkLoading = false;
  }

  onEditOneAlertDefine(alertDefineId: number) {
    if (alertDefineId == null) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-edit'), '');
      return;
    }
    this.editAlertDefine(alertDefineId);
  }

  onEditAlertDefine() {
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
    this.editAlertDefine(alertDefineId);
  }

  updateAlertDefine(alertDefine: AlertDefine) {
    this.tableLoading = true;
    const updateDefine$ = this.alertDefineSvc
      .editAlertDefine(alertDefine)
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
          this.loadAlertDefineTable();
          this.tableLoading = false;
        },
        error => {
          this.tableLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.msg);
        }
      );
  }

  editAlertDefine(alertDefineId: number) {
    this.isManageModalAdd = false;
    this.isManageModalVisible = true;
    this.isManageModalOkLoading = false;
    // 查询告警定义信息
    const getDefine$ = this.alertDefineSvc
      .getAlertDefine(alertDefineId)
      .pipe(
        finalize(() => {
          getDefine$.unsubscribe();
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.define = message.data;
            if (this.define.field) {
              this.cascadeValues = [this.define.app, this.define.metric, this.define.field];
            } else {
              this.cascadeValues = [this.define.app, this.define.metric];
            }
            if (this.define.tags == undefined) {
              this.define.tags = [];
            }
            this.cascadeOnChange(this.cascadeValues);
            this.renderAlertRuleExpr(this.define.expr);
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.monitor-fail'), message.msg);
          }
        },
        error => {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.monitor-fail'), error.msg);
        }
      );
  }

  onDeleteAlertDefines() {
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
      nzOnOk: () => this.deleteAlertDefines(this.checkedDefineIds)
    });
  }

  onDeleteOneAlertDefine(alertDefineId: number) {
    let defineIds = new Set<number>();
    defineIds.add(alertDefineId);
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.deleteAlertDefines(defineIds)
    });
  }

  deleteAlertDefines(defineIds: Set<number>) {
    if (defineIds == null || defineIds.size == 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-delete'), '');
      return;
    }
    this.tableLoading = true;
    const deleteDefines$ = this.alertDefineSvc.deleteAlertDefines(defineIds).subscribe(
      message => {
        deleteDefines$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
          this.loadAlertDefineTable();
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
    this.loadAlertDefineTable();
  }
  // end: 列表多选逻辑

  // start 新增修改告警定义model
  isManageModalVisible = false;
  isManageModalOkLoading = false;
  isManageModalAdd = true;
  define: AlertDefine = new AlertDefine();
  cascadeValues: string[] = [];
  currentMetrics: any[] = [];
  alertRules: any[] = [{}];
  isExpr = false;
  cascadeOnChange(values: string[]): void {
    if (values == null || values.length != 3) {
      return;
    }
    this.appHierarchies.forEach(hierarchy => {
      if (hierarchy.value == values[0]) {
        hierarchy.children.forEach((metrics: { value: string; children: any[] }) => {
          if (metrics.value == values[1]) {
            this.currentMetrics = [];
            if (metrics.children) {
              metrics.children.forEach(item => {
                this.currentMetrics.push(item);
              });
              this.currentMetrics.push({
                value: 'system_value_row_count',
                type: 0,
                label: this.i18nSvc.fanyi('alert.setting.target.system_value_row_count')
              });
            }
          }
        });
      }
    });
  }

  switchAlertRuleShow() {
    this.isExpr = !this.isExpr;
    if (this.isExpr) {
      let expr = this.calculateAlertRuleExpr();
      if (expr != '') {
        this.define.expr = expr;
      }
    }
  }

  onAddNewAlertRule() {
    this.alertRules.push({});
  }

  onRemoveAlertRule(index: number) {
    this.alertRules.splice(index, 1);
  }

  calculateAlertRuleExpr() {
    let rules = this.alertRules.filter(rule => rule.metric != undefined && rule.operator != undefined);
    let index = 0;
    let expr = '';
    rules.forEach(rule => {
      let ruleStr = '';
      if (rule.operator == 'exists' || rule.operator == '!exists') {
        ruleStr = `${rule.operator}(${rule.metric.value})`;
      } else {
        if (rule.metric.type === 0 || rule.metric.type === 3) {
          ruleStr = `${rule.metric.value} ${rule.operator} ${rule.value} `;
        } else if (rule.metric.type === 1) {
          ruleStr = `${rule.operator}(${rule.metric.value},"${rule.value}")`;
        }
      }
      if (ruleStr != '') {
        expr = expr + ruleStr;
      }
      if (index != rules.length - 1) {
        expr = `${expr} && `;
      }
      index++;
    });
    return expr;
  }

  renderAlertRuleExpr(expr: string) {
    if (expr == undefined || expr == '') {
      return;
    }
    if (expr.indexOf('||') > 0 || expr.indexOf(' + ') > 0 || expr.indexOf(' - ') > 0) {
      this.isExpr = true;
      return;
    }
    this.alertRules = [];
    try {
      let exprArr: string[] = expr.split('&&');
      for (let index in exprArr) {
        let exprStr = exprArr[index].trim();
        const twoParamExpressionArr = ['equals', '!equals', 'contains', '!contains', 'matches', '!matches'];
        const oneParamExpressionArr = ['exists', '!exists'];
        let findIndexInTowParamExpression = twoParamExpressionArr.findIndex(value => exprStr.startsWith(value));
        let findIndexInOneParamExpression = oneParamExpressionArr.findIndex(value => exprStr.startsWith(value));
        if (findIndexInTowParamExpression >= 0) {
          let tmp = exprStr.substring(exprStr.indexOf('(') + 1, exprStr.length - 1);
          let tmpArr = tmp.split(',');
          if (tmpArr.length == 2) {
            let metric = this.currentMetrics.find(item => item.value == tmpArr[0].trim());
            let value = tmpArr[1].substring(1, tmpArr[1].length - 1);
            let rule = { metric: metric, operator: twoParamExpressionArr[findIndexInTowParamExpression], value: value };
            this.alertRules.push(rule);
          }
        } else if (findIndexInOneParamExpression >= 0) {
          let tmp = exprStr.substring(exprStr.indexOf('(') + 1, exprStr.length - 1);
          if (tmp != '' && tmp != null) {
            let metric = this.currentMetrics.find(item => item.value == tmp.trim());
            let rule = { metric: metric, operator: oneParamExpressionArr[findIndexInOneParamExpression] };
            this.alertRules.push(rule);
          }
        } else {
          let values = exprStr.trim().split(' ');
          if (values.length == 3 && values[2].trim() != '' && !Number.isNaN(parseFloat(values[2].trim()))) {
            let metric = this.currentMetrics.find(item => item.value == values[0].trim());
            let rule = { metric: metric, operator: values[1].trim(), value: values[2].trim() };
            this.alertRules.push(rule);
          }
        }
      }
      if (this.alertRules.length != exprArr.length) {
        this.alertRules = [{}];
        this.isExpr = true;
        return;
      }
    } catch (e) {
      console.error(e);
      this.isExpr = true;
      this.alertRules = [{}];
      return;
    }
    if (this.alertRules.length == 0) {
      this.alertRules = [{}];
      this.isExpr = true;
    }
  }

  onManageModalCancel() {
    this.isManageModalVisible = false;
  }
  onManageModalOk() {
    this.isManageModalOkLoading = true;
    this.define.app = this.cascadeValues[0];
    this.define.metric = this.cascadeValues[1];
    if (this.cascadeValues.length == 3) {
      this.define.field = this.cascadeValues[2];
      if (!this.isExpr) {
        let expr = this.calculateAlertRuleExpr();
        if (expr != '') {
          this.define.expr = expr;
        }
      }
    } else {
      this.define.expr = '';
      this.define.field = '';
    }
    if (this.isManageModalAdd) {
      const modalOk$ = this.alertDefineSvc
        .newAlertDefine(this.define)
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
              this.loadAlertDefineTable();
            } else {
              this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), message.msg);
            }
          },
          error => {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), error.msg);
          }
        );
    } else {
      const modalOk$ = this.alertDefineSvc
        .editAlertDefine(this.define)
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
              this.loadAlertDefineTable();
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

  onRemoveTag(tag: TagItem) {
    if (this.define != undefined && this.define.tags != undefined) {
      this.define.tags = this.define.tags.filter(item => item !== tag);
    }
  }

  sliceTagName(tag: TagItem): string {
    if (tag.value != undefined && tag.value.trim() != '') {
      return `${tag.name}:${tag.value}`;
    } else {
      return tag.name;
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
      if (this.define.tags.find(tag => tag.name == item.name && tag.value == item.value) == undefined) {
        this.define.tags.push(item);
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
            this.loadAlertDefineTable();
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
  //查询告警阈值
  onFilterSearchAlertDefinesByName() {
    this.tableLoading = true;
    let filter$ = this.alertDefineSvc.getAlertDefines(this.search, this.pageIndex - 1, this.pageSize).subscribe(
      message => {
        filter$.unsubscribe();
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
      },
      error => {
        this.tableLoading = false;
        filter$.unsubscribe();
        console.error(error.msg);
      }
    );
  }
}
