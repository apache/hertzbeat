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

import { Component, Inject, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, NgForm, ValidationErrors } from '@angular/forms';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { Rule, RuleSet, QueryBuilderConfig, QueryBuilderClassNames } from '@kerwin612/ngx-query-builder';
import { NzCascaderFilter } from 'ng-zorro-antd/cascader';
import { ModalButtonOptions, NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzTableQueryParams } from 'ng-zorro-antd/table';
import { TransferChange, TransferItem } from 'ng-zorro-antd/transfer';
import { NzUploadChangeParam } from 'ng-zorro-antd/upload';
import { EMPTY, zip, fromEvent } from 'rxjs';
import { catchError, finalize, map, switchMap, take, tap, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { AlertDefine } from '../../../pojo/AlertDefine';
import { AlertDefineBind } from '../../../pojo/AlertDefineBind';
import { Message } from '../../../pojo/Message';
import { Monitor } from '../../../pojo/Monitor';
import { AlertDefineService } from '../../../service/alert-define.service';
import { AppDefineService } from '../../../service/app-define.service';
import { MonitorService } from '../../../service/monitor.service';

const AVAILABILITY = 'availability';

@Component({
  selector: 'app-alert-setting',
  templateUrl: './alert-setting.component.html',
  styleUrls: ['./alert-setting.component.less']
})
export class AlertSettingComponent implements OnInit, AfterViewInit {
  constructor(
    private modal: NzModalService,
    private notifySvc: NzNotificationService,
    private appDefineSvc: AppDefineService,
    private monitorSvc: MonitorService,
    private alertDefineSvc: AlertDefineService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService,
    private formBuilder: FormBuilder
  ) {
    this.qbFormCtrl = this.formBuilder.control(this.qbData, this.qbValidator);
    this.qbFormCtrl.valueChanges.subscribe(() => {
      if (!this.isExpr) {
        this.updatePreviewExpr();
      }
    });
  }
  @ViewChild('defineForm', { static: false }) defineForm!: NgForm;
  @ViewChild('expr') exprInput!: ElementRef;
  search!: string;
  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;
  defines!: AlertDefine[];
  tableLoading: boolean = true;
  checkedDefineIds = new Set<number>();
  isSwitchExportTypeModalVisible = false;
  exportJsonButtonLoading = false;
  exportYamlButtonLoading = false;
  exportExcelButtonLoading = false;
  appHierarchies!: any[];
  switchExportTypeModalFooter: ModalButtonOptions[] = [
    { label: this.i18nSvc.fanyi('common.button.cancel'), type: 'default', onClick: () => (this.isSwitchExportTypeModalVisible = false) }
  ];
  qbClassNames: QueryBuilderClassNames = {
    row: 'row',
    tree: 'tree',
    rule: 'br-4 rule',
    ruleSet: 'br-4 ruleset',
    invalidRuleSet: 'br-4 ruleset-invalid'
  };
  qbConfig: QueryBuilderConfig = {
    levelLimit: 3,
    rulesLimit: 5,
    fields: {},
    getInputType: () => 'custom'
  };
  qbData: RuleSet = {
    condition: 'and',
    rules: []
  };
  qbValidator = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value || !control.value.rules || control.value.rules.length === 0) {
      return { required: true };
    }
    return null;
  };
  qbFormCtrl: FormControl;
  appMap = new Map<string, string>();
  appEntries: Array<{ value: any; key: string }> = [];
  previewExpr: string = '';

  ngOnInit(): void {
    this.loadAlertDefineTable();
    // query monitoring hierarchy
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
            // 修改层级结构
            this.appHierarchies.forEach(item => {
              if (item.children) {
                // 保存原始的字段信息
                item.children.forEach((metric: any) => {
                  if (metric.children) {
                    metric.fields = metric.children;
                  }
                  // 设置为叶子节点
                  metric.isLeaf = true;
                  // 删除 children 属性
                  delete metric.children;
                });
                // 添加可用性选项
                item.children.unshift({
                  value: AVAILABILITY,
                  label: this.i18nSvc.fanyi('monitor.availability'),
                  isLeaf: true
                });
              } else {
                item.children = [
                  {
                    value: AVAILABILITY,
                    label: this.i18nSvc.fanyi('monitor.availability'),
                    isLeaf: true
                  }
                ];
              }
            });
          } else {
            console.warn(message.msg);
          }
        },
        error => {
          console.warn(error.msg);
        }
      );
    // query i18n content
    this.appDefineSvc
      .getAppDefines(this.i18nSvc.defaultLang)
      .pipe()
      .subscribe(
        message => {
          if (message.code === 0) {
            this.appMap = message.data;
            this.appEntries = Object.entries(this.appMap).map(([key, value]) => ({ key, value }));
          } else {
            console.warn(message.msg);
          }
        },
        error => {
          console.warn(error.msg);
        }
      );
  }

  ngAfterViewInit() {
    if (this.exprInput) {
      fromEvent(this.exprInput.nativeElement, 'input')
        .pipe(debounceTime(300), distinctUntilChanged())
        .subscribe(() => {
          if (this.isExpr) {
            this.updatePreviewExpr();
          }
        });
    }
  }

  sync() {
    this.loadAlertDefineTable();
  }

  loadAlertDefineTable() {
    this.tableLoading = true;
    const translationSearchList: string[] = [];
    let trimSearch = '';
    if (this.search !== undefined && this.search.trim() !== '') {
      trimSearch = this.search.trim();
    }
    // Filter entries based on search input
    this.appEntries.forEach(entry => {
      if (trimSearch && entry.value.toLowerCase().includes(trimSearch.toLowerCase())) {
        translationSearchList.push(entry.key);
      }
    });
    // If no match found and search input exists, add search term to list
    if (translationSearchList.length === 0 && trimSearch) {
      translationSearchList.push(trimSearch);
    }
    let alertDefineInit$ = this.alertDefineSvc.getAlertDefines(translationSearchList, this.pageIndex - 1, this.pageSize).subscribe(
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
    this.resetQbDataDefault();
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
    if (this.isLoadingEdit !== -1) return;
    this.isLoadingEdit = alertDefineId;
    this.isManageModalAdd = false;
    this.isManageModalOkLoading = false;

    const getDefine$ = this.alertDefineSvc
      .getAlertDefine(alertDefineId)
      .pipe(
        finalize(() => {
          getDefine$.unsubscribe();
          this.isLoadingEdit = -1;
          this.isManageModalVisible = true;
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.define = message.data;

            // 从表达式解析出级联值
            this.cascadeValues = this.exprToCascadeValues(this.define.expr);

            // 等待级联选择器更新后再处理阈值规则
            setTimeout(() => {
              // 移除表达式中的app/metric部分,展示其他条件
              const userExpr = this.removeAppMetricFieldExpr(this.define.expr);

              // 根据指标类型决定显示方式
              if (this.cascadeValues[1] === 'availability') {
                this.isExpr = false;
              } else {
                // 尝试解析阈值表达式
                this.tryParseThresholdExpr(userExpr);
              }
            });

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
          this.updatePageIndex(defineIds.size);
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

  updatePageIndex(delSize: number) {
    const lastPage = Math.max(1, Math.ceil((this.total - delSize) / this.pageSize));
    this.pageIndex = this.pageIndex > lastPage ? lastPage : this.pageIndex;
  }

  onExportDefines() {
    if (this.checkedDefineIds == null || this.checkedDefineIds.size == 0) {
      this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.no-select-export'), '');
      return;
    }
    this.isSwitchExportTypeModalVisible = true;
  }

  exportDefines(type: string) {
    if (this.checkedDefineIds == null || this.checkedDefineIds.size == 0) {
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
      case 'YAML':
        this.exportYamlButtonLoading = true;
        break;
    }
    const exportDefines$ = this.alertDefineSvc
      .exportAlertDefines(this.checkedDefineIds, type)
      .pipe(
        finalize(() => {
          this.exportYamlButtonLoading = false;
          this.exportExcelButtonLoading = false;
          this.exportJsonButtonLoading = false;
          exportDefines$.unsubscribe();
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

  onImportDefines(info: NzUploadChangeParam): void {
    if (info.file.response) {
      this.tableLoading = true;
      const message = info.file.response;
      if (message.code === 0) {
        this.notifySvc.success(this.i18nSvc.fanyi('common.notify.import-success'), '');
        this.loadAlertDefineTable();
      } else {
        this.tableLoading = false;
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.import-fail'), message.msg);
      }
    }
  }

  // begin: List multiple choice paging
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
   * Paging callback
   *
   * @param params page info
   */
  onTablePageChange(params: NzTableQueryParams) {
    const { pageSize, pageIndex, sort, filter } = params;
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
    this.loadAlertDefineTable();
  }
  // end: List multiple choice paging

  // start -- new or update alert definition model
  isLoadingEdit = -1;
  isManageModalVisible = false;
  isManageModalOkLoading = false;
  isManageModalAdd = true;
  define: AlertDefine = new AlertDefine();
  cascadeValues: string[] = [];
  currentMetrics: any[] = [];
  isExpr = false;

  private getOperatorsByType(type: number): string[] {
    if (type === 0 || type === 3) {
      return ['>', '<', '==', '!=', '<=', '>=', 'exists', '!exists'];
    } else if (type === 1) {
      return ['equals', '!equals', 'contains', '!contains', 'matches', '!matches', 'exists', '!exists'];
    }
    return [];
  }

  private rule2expr(rule: Rule): string {
    if (!rule.field) return '';

    switch (rule.operator) {
      case 'exists':
      case '!exists':
        return `${rule.operator}(${rule.field})`;

      case 'equals':
      case '!equals':
      case 'contains':
      case '!contains':
      case 'matches':
      case '!matches':
        return `${rule.operator}(${rule.field}, "${rule.value}")`;

      case '>':
      case '>=':
      case '<':
      case '<=':
      case '==':
      case '!=':
        // 如果字段包含方法调用
        if (rule.field.includes('.') && rule.field.includes('()')) {
          return `${rule.field} ${rule.operator} ${rule.value}`;
        }
        return `${rule.field} ${rule.operator} ${rule.value}`;

      default:
        return '';
    }
  }

  private ruleset2expr(ruleset: RuleSet): string {
    if (ruleset.rules.length === 0) {
      return '';
    }
    return `(${ruleset.rules
      .map((rule: any) => (!!(rule as RuleSet).rules ? this.ruleset2expr(rule as RuleSet) : this.rule2expr(rule as Rule)))
      .filter((s: any) => !!s)
      .join(` ${ruleset.condition} `)})`;
  }

  private parseRule1(str: string): any {
    if (str.startsWith('(')) {
      let start = str.indexOf('(');
      let operatorPrefix = str.indexOf(' ');
      let fieldString = str.substring(start + 1, operatorPrefix);
      if (fieldString.indexOf('(') === -1 && fieldString.indexOf(')') === -1 && fieldString.indexOf('!') === -1) {
        let operatorSuffix = fieldString.length + 2 + str.substring(operatorPrefix + 1).indexOf(' ');
        return {
          rst: {
            field: fieldString.trim(),
            operator: str.substring(operatorPrefix, operatorSuffix).trim(),
            value: str.substring(operatorSuffix + 1, str.indexOf(')')).trim()
          },
          pos: str.indexOf(')') + 1
        };
      }
    }
    return {
      pos: 0
    };
  }

  private parseRule2(str: string): any {
    if (str.startsWith('exists') || str.startsWith('!exists')) {
      let start = str.indexOf('(');
      let end = str.indexOf(')');
      return {
        rst: {
          field: str.substring(start + 1, end).trim(),
          operator: str.substring(0, start).trim()
        },
        pos: end + 1
      };
    }
    return {
      pos: 0
    };
  }

  private parseRule3(str: string): any {
    if (
      str.startsWith('matches') ||
      str.startsWith('!matches') ||
      str.startsWith('contains') ||
      str.startsWith('!contains') ||
      str.startsWith('equals') ||
      str.startsWith('!equals')
    ) {
      let start = str.indexOf('(');
      let end = str.indexOf(')');
      let comma = str.indexOf(',');
      return {
        rst: {
          field: str.substring(start + 1, comma).trim(),
          operator: str.substring(0, start).trim(),
          value: str.substring(comma + 2, end - 1).trim() // remove double quotes
        },
        pos: end + 1
      };
    }
    return {
      pos: 0
    };
  }

  private filterEmptyRules(ruleset: RuleSet): RuleSet | Rule {
    if (ruleset.rules.length === 1 && (ruleset.rules[0] as RuleSet).rules) {
      return ruleset.rules[0];
    } else {
      return ruleset;
    }
  }

  private expr2ruleset(expr: string | undefined): RuleSet {
    // 处理空值情况
    if (!expr || expr.trim() === '') {
      return { condition: 'and', rules: [] };
    }

    // 移除可能的外层括号
    expr = expr.replace(/^\((.*)\)$/, '$1').trim();

    let ruleset: RuleSet = { condition: 'and', rules: [] };

    // 处理 AND/OR 连接的多个条件
    const parts = expr.split(/\s+(and|or)\s+/i);
    if (parts.length > 1) {
      ruleset.condition = expr.toLowerCase().includes(' and ') ? 'and' : 'or';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        if (!part || part.toLowerCase() === 'and' || part.toLowerCase() === 'or') continue;

        // 解析单个规则
        const rule = this.parseExprToRule(part);
        if (rule) {
          ruleset.rules.push(rule);
        }
      }
    } else {
      // 单个条件的情况
      const rule = this.parseExprToRule(expr);
      if (rule) {
        ruleset.rules.push(rule);
      }
    }

    return ruleset;
  }

  // 修改 parseExprToRule 方法，增强解析能力
  private parseExprToRule(expr: string): Rule | null {
    // 移除可能的括号
    expr = expr.replace(/^\((.*)\)$/, '$1').trim();

    // 1. 解析比较运算符表达式：field > value 或 field >= value 等
    const compareMatch = expr.match(/^(\w+)\s*([><=!]+)\s*(\d+(?:\.\d+)?)$/);
    if (compareMatch) {
      const [_, field, operator, value] = compareMatch;
      return {
        field,
        operator,
        value: parseFloat(value)
      };
    }

    // 2. 解析 exists/!exists
    const existsMatch = expr.match(/^(!?exists)\(([^)]+)\)$/);
    if (existsMatch) {
      const [_, operator, field] = existsMatch;
      return {
        field,
        operator
      };
    }

    // 3. 解析字符串函数：equals/contains/matches
    const funcMatch = expr.match(/^(!?(?:equals|contains|matches))\(([^,]+),\s*"([^"]+)"\)$/);
    if (funcMatch) {
      const [_, operator, field, value] = funcMatch;
      return {
        field,
        operator,
        value
      };
    }

    // 4. 解析特殊格式：field.method() > value
    const methodMatch = expr.match(/^(\w+)\.(\w+)\(\)\s*([><=!]+)\s*(\d+(?:\.\d+)?)$/);
    if (methodMatch) {
      const [_, field, method, operator, value] = methodMatch;
      return {
        field: `${field}.${method}()`,
        operator,
        value: parseFloat(value)
      };
    }

    return null;
  }

  getOperatorLabelByType = (operator: string) => {
    switch (operator) {
      case 'equals':
        return 'alert.setting.rule.operator.str-equals';
      case '!equals':
        return 'alert.setting.rule.operator.str-no-equals';
      case 'contains':
        return 'alert.setting.rule.operator.str-contains';
      case '!contains':
        return 'alert.setting.rule.operator.str-no-contains';
      case 'matches':
        return 'alert.setting.rule.operator.str-matches';
      case '!matches':
        return 'alert.setting.rule.operator.str-no-matches';
      case 'exists':
        return 'alert.setting.rule.operator.exists';
      case '!exists':
        return 'alert.setting.rule.operator.no-exists';
      default:
        return operator;
    }
  };

  caseInsensitiveFilter: NzCascaderFilter = (i, p) => {
    return p.some(o => {
      const label = o.label;
      return !!label && label.toLowerCase().indexOf(i.toLowerCase()) !== -1;
    });
  };

  cascadeOnChange(values: string[]): void {
    if (!values || values.length < 2) {
      this.resetQbDataDefault();
      return;
    }

    // 更新UI相关配置
    this.appHierarchies.forEach(hierarchy => {
      if (hierarchy.value == values[0]) {
        hierarchy.children.forEach((metrics: { value: string; fields?: any[] }) => {
          if (metrics.value == values[1]) {
            this.currentMetrics = [];
            // 如果不是可用性指标且有字段信息，则加载指标字段
            if (metrics.value !== 'availability' && metrics.fields) {
              let fields: any = {};
              metrics.fields.forEach(item => {
                this.currentMetrics.push(item);
                fields[item.value] = {
                  name: item.label,
                  type: item.type,
                  unit: item.unit,
                  operators: this.getOperatorsByType(item.type)
                };
              });
              let fixedItem = {
                value: 'system_value_row_count',
                type: 0,
                label: this.i18nSvc.fanyi('alert.setting.target.system_value_row_count')
              };
              this.currentMetrics.push(fixedItem);
              fields[fixedItem.value] = {
                name: fixedItem.label,
                type: fixedItem.type,
                operators: this.getOperatorsByType(fixedItem.type)
              };
              this.qbConfig = { ...this.qbConfig, fields };

              // 如果是编辑模式，尝试重新解析表达式
              if (!this.isManageModalAdd && this.define.expr) {
                const userExpr = this.removeAppMetricFieldExpr(this.define.expr);
                this.tryParseThresholdExpr(userExpr);
              }
            }
          }
        });
      }
    });
    this.updatePreviewExpr();
  }

  switchAlertRuleShow() {
    if (this.isExpr) {
      // 从可视化规则切换到表达式模式
      const expr = this.ruleset2expr(this.qbData);
      if (expr) {
        this.define.expr = expr;
      }
    } else {
      // 从表达式模式切换到可视化规则
      try {
        const userExpr = this.removeAppMetricFieldExpr(this.define.expr);
        this.tryParseThresholdExpr(userExpr);
      } catch (e) {
        console.warn('Failed to parse expression:', e);
        this.resetQbDataDefault();
      }
    }
    this.updatePreviewExpr();
  }

  renderAlertRuleExpr(expr: string | undefined) {
    if (!expr) {
      return;
    }
    if (expr.indexOf('||') > 0 || expr.indexOf(' + ') > 0 || expr.indexOf(' - ') > 0) {
      this.isExpr = true;
      return;
    }
    try {
      this.resetQbData(this.expr2ruleset(expr));
      this.isExpr = false;
    } catch (e) {
      console.error(e);
      this.isExpr = true;
      this.resetQbDataDefault();
      return;
    }
  }

  onManageModalCancel() {
    this.cascadeValues = [];
    this.isExpr = false;
    this.resetQbDataDefault();
    this.isManageModalVisible = false;
  }

  resetQbData(qbData: RuleSet) {
    this.qbFormCtrl.reset((this.qbData = qbData));
  }

  resetQbDataDefault() {
    this.resetQbData({ condition: 'and', rules: [] });
  }

  resetManageModalData() {
    this.cascadeValues = [];
    this.isExpr = false;
    this.resetQbDataDefault();
    this.isManageModalVisible = false;
    this.previewExpr = '';
  }

  onManageModalOk() {
    if (this.cascadeValues.length == 3) {
      this.defineForm.form.addControl('ruleset', this.qbFormCtrl);
    }
    if (this.defineForm?.invalid) {
      Object.values(this.defineForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }
    this.isManageModalOkLoading = true;

    // 构建基础表达式(app/metric/field)
    const baseExpr = this.cascadeValuesToExpr(this.cascadeValues);

    // 构建阈值表达式
    let thresholdExpr = '';
    if (this.cascadeValues.length == 3 && !this.isExpr) {
      thresholdExpr = this.ruleset2expr(this.qbData);
    } else if (this.isExpr) {
      thresholdExpr = this.define.expr || '';
    }

    // 合并表达式
    if (baseExpr && thresholdExpr) {
      this.define.expr = `${baseExpr} && (${thresholdExpr})`;
    } else if (baseExpr) {
      this.define.expr = baseExpr;
    } else if (thresholdExpr) {
      this.define.expr = thresholdExpr;
    } else {
      this.define.expr = '';
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
              this.cascadeValues = [];
              this.isManageModalVisible = false;
              this.notifySvc.success(this.i18nSvc.fanyi('common.notify.new-success'), '');
              this.loadAlertDefineTable();
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
              this.cascadeValues = [];
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
  // end -- new or update alert definition model

  // start -- associate alert definition and monitoring model
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
  // end -- associate alert definition and monitoring model

  // 新增方法:将级联选择的值转换为表达式
  private cascadeValuesToExpr(values: string[]): string {
    if (!values || values.length < 2) return '';

    // 可用性指标特殊处理
    if (values[1] === 'availability') {
      return `equals(app,"${values[0]}") && equals(availability,"up")`;
    }

    return `equals(app,"${values[0]}") && equals(metric,"${values[1]}")`;
  }

  // 新增方法:从表达式中解析出级联值
  public exprToCascadeValues(expr: string | undefined): string[] {
    const values: string[] = [];

    if (!expr) {
      return values;
    }

    const appMatch = expr.match(/equals\(app,"([^"]+)"\)/);
    const metricMatch = expr.match(/equals\(metric,"([^"]+)"\)/);
    const availabilityMatch = expr.match(/equals\(availability,"up"\)/);

    if (!appMatch) {
      return values;
    }

    values.push(appMatch[1]);

    // 如果存在可用性表达式，则添加 availability
    if (availabilityMatch) {
      values.push('availability');
    } else if (metricMatch) {
      values.push(metricMatch[1]);
    }

    return values;
  }

  // 新增方法:移除表达式中的app/metric/field条件
  private removeAppMetricFieldExpr(expr: string | undefined): string {
    if (!expr) return '';

    return expr
      .replace(/equals\(app,"[^"]+"\)\s*&&\s*/, '')
      .replace(/equals\(metric,"[^"]+"\)\s*&&\s*/, '')
      .replace(/equals\(availability,"up"\)\s*&&\s*/, '') // 添加可用性表达式的移除
      .replace(/^\s*&&\s*/, '')
      .replace(/\s*&&\s*$/, '');
  }

  // 新增方法：尝试解析阈值表达式
  private tryParseThresholdExpr(expr: string | undefined): void {
    if (!expr || !expr.trim()) {
      this.resetQbDataDefault();
      this.isExpr = false;
      return;
    }

    try {
      // 首先尝试解析为可视化规则
      const ruleset = this.expr2ruleset(expr);
      if (ruleset && ruleset.rules && ruleset.rules.length > 0) {
        this.resetQbData(ruleset);
        this.isExpr = false;
        return;
      }

      // 如果无法解析为可视化规则，切换到表达式模式
      this.isExpr = true;
      this.define.expr = expr;
      this.resetQbDataDefault();
    } catch (e) {
      console.warn('Failed to parse threshold expr:', e);
      this.isExpr = true;
      this.define.expr = expr;
      this.resetQbDataDefault();
    }
  }

  // 新增方法：更新预览表达式
  public updatePreviewExpr(): void {
    // 构建基础表达式(app/metric)
    const baseExpr = this.cascadeValuesToExpr(this.cascadeValues);

    // 构建阈值表达式
    let thresholdExpr = '';
    if (this.cascadeValues.length >= 2 && this.cascadeValues[1] !== 'availability') {
      if (!this.isExpr) {
        // 使用可视化规则构建器的值
        thresholdExpr = this.ruleset2expr(this.qbData);
      } else {
        // 使用表达式输入框的值
        thresholdExpr = this.define.expr || '';
      }
    }

    // 合并表达式
    if (baseExpr && thresholdExpr) {
      this.previewExpr = `${baseExpr} && (${thresholdExpr})`;
    } else if (baseExpr) {
      this.previewExpr = baseExpr;
    } else if (thresholdExpr) {
      this.previewExpr = thresholdExpr;
    } else {
      this.previewExpr = '';
    }
  }
}
