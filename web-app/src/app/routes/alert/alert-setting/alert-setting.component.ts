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

import { Component, ElementRef, HostListener, Inject, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, NgForm, ValidationErrors } from '@angular/forms';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { Rule, RuleSet, QueryBuilderConfig, QueryBuilderClassNames } from '@kerwin612/ngx-query-builder';
import { NzCascaderFilter } from 'ng-zorro-antd/cascader';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ModalButtonOptions, NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzTableQueryParams } from 'ng-zorro-antd/table';
import { TransferChange, TransferItem } from 'ng-zorro-antd/transfer';
import { NzUploadChangeParam } from 'ng-zorro-antd/upload';
import { finalize } from 'rxjs/operators';

import { AlertDefine } from '../../../pojo/AlertDefine';
import { AlertDefineService } from '../../../service/alert-define.service';
import { AppDefineService } from '../../../service/app-define.service';
import { MonitorService } from '../../../service/monitor.service';

const AVAILABILITY = 'availability';

@Component({
  selector: 'app-alert-setting',
  templateUrl: './alert-setting.component.html',
  styleUrls: ['./alert-setting.component.less']
})
export class AlertSettingComponent implements OnInit {
  private savedSelectionStart = 0;
  private savedSelectionEnd = 0;
  constructor(
    private modal: NzModalService,
    private notifySvc: NzNotificationService,
    private appDefineSvc: AppDefineService,
    private monitorSvc: MonitorService,
    private alertDefineSvc: AlertDefineService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService,
    private formBuilder: FormBuilder,
    private message: NzMessageService
  ) {
    this.qbFormCtrl = this.formBuilder.control(this.qbData, this.qbValidator);
    this.qbFormCtrl.valueChanges.subscribe(() => {
      this.userExpr = this.ruleset2expr(this.qbFormCtrl.value);
      this.updateFinalExpr();
    });
  }
  @ViewChild('defineForm', { static: false }) defineForm!: NgForm;
  search!: string;
  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;
  defines!: AlertDefine[];
  tableLoading: boolean = true;
  checkedDefineIds = new Set<number>();
  isSwitchExportTypeModalVisible = false;
  exportJsonButtonLoading = false;
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

  templateEnvVars = [
    { name: '${__instance__}', description: 'alert.setting.template.vars.instance' },
    { name: '${__labels__}', description: 'alert.setting.template.vars.labels' },
    { name: '${__instancename__}', description: 'alert.setting.template.vars.instance-name' },
    { name: '${__instancehost__}', description: 'alert.setting.template.vars.instance-host' },
    { name: '${__app__}', description: 'alert.setting.template.vars.app' },
    { name: '${__metrics__}', description: 'alert.setting.template.vars.metrics' }
  ];

  commonOperators = [
    { value: '==', description: 'alert.setting.expr.operator.equals' },
    { value: '!=', description: 'alert.setting.expr.operator.not-equals' },
    { value: '>', description: 'alert.setting.expr.operator.greater' },
    { value: '>=', description: 'alert.setting.expr.operator.greater-equals' },
    { value: '<', description: 'alert.setting.expr.operator.less' },
    { value: '<=', description: 'alert.setting.expr.operator.less-equals' },
    { value: '&&', description: 'alert.setting.expr.operator.and' },
    { value: '||', description: 'alert.setting.expr.operator.or' },
    { value: '()', description: 'alert.setting.expr.operator.brackets' }
  ];

  isSelectTypeModalVisible = false;

  previewData: any[] = [];
  previewColumns: Array<{ title: string; key: string; width?: string }> = [];
  previewTableLoading = false;

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
            // Modify hierarchy structure
            this.appHierarchies.forEach(item => {
              if (item.children) {
                // Save original field information
                item.children.forEach((metric: any) => {
                  if (metric.children) {
                    metric.fields = metric.children;
                  }
                  // Set as leaf node
                  metric.isLeaf = true;
                  // Delete children property
                  delete metric.children;
                });
                // Add availability option
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

  sync() {
    this.loadAlertDefineTable();
  }

  loadAlertDefineTable() {
    this.tableLoading = true;
    const translationSearchList: string[] = [];
    let trimSearch = '';
    if (this.search && this.search.trim() !== '') {
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

    let alertDefineInit$ = this.alertDefineSvc
      .getAlertDefines(translationSearchList, this.pageIndex - 1, this.pageSize)
      .subscribe(message => {
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
      });
  }

  onNewAlertDefine() {
    this.isSelectTypeModalVisible = true;
  }

  onSelectAlertType(type: string) {
    this.isSelectTypeModalVisible = false;
    this.define = new AlertDefine();
    this.define.type = type;
    this.severity = '';
    this.userExpr = '';
    this.selectedMonitorIds = new Set<number>();
    this.selectedLabels = new Set<string>();
    // Set default period for periodic alert
    if (type === 'periodic') {
      this.define.period = 300;
    }
    this.resetQbDataDefault();
    this.isManageModalAdd = true;
    this.isManageModalVisible = true;
    this.isManageModalOkLoading = false;
  }

  onSelectTypeModalCancel() {
    this.isSelectTypeModalVisible = false;
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
    }
    const exportDefines$ = this.alertDefineSvc
      .exportAlertDefines(this.checkedDefineIds, type)
      .pipe(
        finalize(() => {
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
    const { pageSize, pageIndex } = params;
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
  userExpr!: string;
  severity!: string;

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
          this.clearPreview();
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.define = message.data;
            if (this.define.labels && this.define.labels['severity']) {
              this.severity = this.define.labels['severity'];
            }
            // Set default period for periodic alert if not set
            if (this.define.type === 'periodic' && !this.define.period) {
              this.define.period = 300;
            }
            // Set default type as realtime if not set
            if (!this.define.type) {
              this.define.type = 'realtime';
            }
            if (this.define.type == 'realtime') {
              // Parse expression to cascade values
              this.cascadeValues = this.exprToCascadeValues(this.define.expr);
              this.userExpr = this.exprToUserExpr(this.define.expr);
              this.parseMonitorIdsFromExpr(this.define.expr);
              this.parseLabelFromExpr(this.define.expr);
              this.cascadeOnChange(this.cascadeValues);
              // Wait for cascade values to be set
              setTimeout(() => {
                if (this.cascadeValues[1] === 'availability') {
                  this.isExpr = false;
                } else {
                  this.tryParseThresholdExpr(this.userExpr);
                }
              });
            }
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.query-fail'), message.msg);
          }
        },
        error => {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.query-fail'), error.msg);
        }
      );
  }

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
    if (!ruleset.rules || ruleset.rules.length === 0) {
      return '';
    }

    const exprs = ruleset.rules
      .map(rule => {
        if ('condition' in rule) {
          // Always wrap nested RuleSet with brackets
          const nestedExpr = this.ruleset2expr(rule as RuleSet);
          return nestedExpr ? `(${nestedExpr})` : '';
        } else {
          // Single rule doesn't need brackets
          return this.rule2expr(rule as Rule);
        }
      })
      .filter(expr => expr);

    // Join with condition operator
    return exprs.join(` ${ruleset.condition} `);
  }

  private expr2ruleset(expr: string): RuleSet {
    if (!expr || !expr.trim()) {
      return { condition: 'and', rules: [] };
    }

    try {
      console.log('Parsing expression:', expr);

      // Helper function: find operator position considering brackets
      const findOperator = (str: string): { operator: string; position: number } | null => {
        let bracketCount = 0;
        let i = 0;

        while (i < str.length) {
          const char = str[i];

          if (char === '(') bracketCount++;
          else if (char === ')') bracketCount--;

          // Only look for operators at bracket level 0
          if (bracketCount === 0) {
            if (str.substring(i).startsWith(' and ')) {
              return { operator: 'and', position: i };
            }
            if (str.substring(i).startsWith(' or ')) {
              return { operator: 'or', position: i };
            }
          }
          i++;
        }
        return null;
      };

      // Helper function: validate and extract bracket content
      const extractBracketContent = (str: string): string | null => {
        if (!str.startsWith('(') || !str.endsWith(')')) return null;

        let bracketCount = 0;
        for (let i = 0; i < str.length; i++) {
          if (str[i] === '(') bracketCount++;
          if (str[i] === ')') bracketCount--;
          if (bracketCount < 0) return null;
        }
        return bracketCount === 0 ? str.slice(1, -1) : null;
      };

      // Helper function: parse expression recursively
      const parseExpr = (str: string): RuleSet | Rule | null => {
        str = str.trim();
        if (!str) return null;

        console.log('Parsing sub-expression:', str);

        // Try to parse as a single rule first
        const rule = this.parseExprToRule(str);
        if (rule) {
          console.log('Parsed as rule:', rule);
          return rule;
        }

        // Look for top-level AND/OR
        const operatorInfo = findOperator(str);
        if (operatorInfo) {
          const { operator, position } = operatorInfo;
          const left = str.substring(0, position).trim();
          const right = str.substring(position + (operator === 'and' ? 5 : 4)).trim();

          console.log(`Found ${operator} operator, splitting:`, { left, right });

          const ruleset: RuleSet = {
            condition: operator,
            rules: []
          };

          const leftResult = parseExpr(left);
          const rightResult = parseExpr(right);

          if (leftResult) {
            console.log('Adding left result:', leftResult);
            ruleset.rules.push(leftResult);
          }
          if (rightResult) {
            console.log('Adding right result:', rightResult);
            ruleset.rules.push(rightResult);
          }

          return ruleset;
        }

        // If no top-level operator found, try parsing bracketed content
        const bracketContent = extractBracketContent(str);
        if (bracketContent) {
          console.log('Found bracketed content:', bracketContent);
          const result = parseExpr(bracketContent);
          if (result) {
            // If it's already a RuleSet, keep the structure
            if ('condition' in result) {
              console.log('Returning nested ruleset:', result);
              return result;
            } else {
              // Create a new RuleSet for single rule to maintain bracket structure
              console.log('Creating ruleset for bracketed rule:', result);
              return {
                condition: 'and',
                rules: [result]
              };
            }
          }
        }

        return null;
      };

      const result = parseExpr(expr);
      if (!result) {
        console.warn('Failed to parse expression, returning empty ruleset');
        return { condition: 'and', rules: [] };
      }

      if ('condition' in result) {
        console.log('Final ruleset:', result);
        return result;
      } else {
        console.log('Creating final ruleset for single rule:', result);
        return {
          condition: 'and',
          rules: [result]
        };
      }
    } catch (e) {
      console.error('Failed to parse expression:', e);
      return { condition: 'and', rules: [] };
    }
  }

  private parseExprToRule(expr: string): Rule | null {
    try {
      expr = expr.trim();

      // Parse exists/!exists
      const existsMatch = expr.match(/^(!)?exists\(([^)]+)\)$/);
      if (existsMatch) {
        const [_, not, field] = existsMatch;
        return {
          field,
          operator: not ? '!exists' : 'exists'
        };
      }

      // Parse string functions (equals, contains, matches)
      const funcMatch = expr.match(/^(!)?(?:equals|contains|matches)\(([^,]+),\s*"([^"]+)"\)$/);
      if (funcMatch) {
        const [_, not, field, value] = funcMatch;
        const func = expr.match(/equals|contains|matches/)?.[0] || '';
        return {
          field,
          operator: not ? `!${func}` : func,
          value
        };
      }

      // Parse numeric comparisons
      const compareMatch = expr.match(/^(\w+(?:\.\w+)*)\s*([><=!]+)\s*(-?\d+(?:\.\d+)?)$/);
      if (compareMatch) {
        const [_, field, operator, value] = compareMatch;
        return {
          field,
          operator,
          value: Number(value)
        };
      }

      return null;
    } catch (e) {
      console.error('Failed to parse rule:', e);
      return null;
    }
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
                value: '__row__',
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
            }
          }
        });
      }
    });
    this.updateFinalExpr();
  }

  switchAlertRuleShow() {
    if (!this.isExpr) {
      try {
        this.tryParseThresholdExpr(this.userExpr);
      } catch (e) {
        this.notifySvc.error('Parse threshold expr to visual error', '');
        console.warn('Parse Threshold Expr to Visual error:', e);
        this.resetQbDataDefault();
      }
    }
  }

  onSeverityChange() {
    if (!this.define.labels) {
      this.define.labels = {};
    }
    this.define.labels = { ...this.define.labels, severity: this.severity };
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
  filteredTransferData: TransferItem[] = [];
  transferData: TransferItem[] = [];
  selectedMonitorIds = new Set<number>();
  leftMonitorLabels: Set<string> = new Set(); // All available labels on the left side
  rightMonitorLabels: Set<string> = new Set(); // All available labels on the right side
  leftSearchValue = '';
  rightSearchValue = '';
  leftFilterLabels: string[] = []; // Labels used for filtering on the left side
  rightFilterLabels: string[] = []; // Labels used for filtering on the right side
  labelInputVisible = false;
  selectedLabels: Set<string> = new Set(); // Selected labels
  inputLabelValue = '';
  labelInputElement!: ElementRef<HTMLInputElement>;

  $asTransferItems = (data: unknown): TransferItem[] => data as TransferItem[];
  onConnectModalCancel() {
    this.isConnectModalVisible = false;
  }
  onExportTypeModalCancel() {
    this.isSwitchExportTypeModalVisible = false;
  }
  onConnectModalOk() {
    // Update expression with new monitor bindings
    this.updateFinalExpr();
    this.isConnectModalVisible = false;
  }
  change(ret: TransferChange): void {
    const listKeys = ret.list.map(l => l.key);
    const hasOwnKey = (e: TransferItem): boolean => e.hasOwnProperty('key');

    // Update selectedMonitorIds based on transfer changes
    if (ret.to === 'right') {
      listKeys.forEach(key => this.selectedMonitorIds.add(key));
    } else {
      listKeys.forEach(key => this.selectedMonitorIds.delete(key));
    }

    // Update transfer data UI
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
    this.updateMonitorLabel();
  }

  handleDeleteLabel(removedLabel: string): void {
    this.selectedLabels.delete(removedLabel);
  }

  showLabelInput(): void {
    this.labelInputVisible = true;
    setTimeout(() => {
      this.labelInputElement?.nativeElement.focus();
    }, 10);
  }

  handleLabelInputConfirm(): void {
    if (this.inputLabelValue && !this.selectedLabels.has(this.inputLabelValue)) {
      this.selectedLabels.add(this.inputLabelValue);
    }
    this.inputLabelValue = '';
    this.labelInputVisible = false;
  }

  onFilterLabelsChange(newLabels: string[], direction: string): void {
    if (direction == 'left') {
      this.leftFilterLabels = newLabels;
    } else {
      this.rightFilterLabels = newLabels;
    }
    this.handleSearch(direction);
  }
  onSearchValueChange(value: string, direction: string): void {
    if (direction === 'left') {
      this.leftSearchValue = value;
    } else {
      this.rightSearchValue = value;
    }
    this.handleSearch(direction);
  }

  getFilterLabels(direction: string): string[] {
    return direction === 'left' ? this.leftFilterLabels : this.rightFilterLabels;
  }

  getSearchValue(direction: string): string {
    return direction === 'left' ? this.leftSearchValue : this.rightSearchValue;
  }

  getMonitorLabels(direction: string): Set<string> {
    return direction === 'left' ? this.leftMonitorLabels : this.rightMonitorLabels;
  }

  updateMonitorLabel() {
    // Extract all labels
    this.leftMonitorLabels.clear();
    this.rightMonitorLabels.clear();
    this.transferData.forEach(item => {
      item.labels.forEach((label: string) => {
        if (item.direction === 'left') {
          this.leftMonitorLabels.add(label);
        } else {
          this.rightMonitorLabels.add(label);
        }
      });
    });
  }

  handleSearch(direction: string): void {
    // keep the items that are not in the current direction
    let keepItems: TransferItem[] = this.filteredTransferData.filter(item => item.direction != direction);

    // if the search value is empty
    if (
      (direction == 'left' && !this.leftSearchValue && !this.leftFilterLabels.length) ||
      (direction == 'right' && !this.rightSearchValue && !this.rightFilterLabels.length)
    ) {
      const filteredItems = this.transferData.filter(item => item.direction === direction);
      this.filteredTransferData = [...keepItems, ...filteredItems];
      return;
    }

    // Handle name search
    const nameSearchResult = this.handelNameSearch(direction);

    // Handle label search
    const labelSearchResult = this.handelLabelSearch(direction);

    // Create Map of items by key for efficient lookup
    const nameSearchMap = new Map(nameSearchResult.map(item => [item.title, item]));
    // Find intersection - only keep items that exist in both result sets
    const filteredItems = labelSearchResult.filter(item => nameSearchMap.has(item.title));
    const result = [...keepItems, ...filteredItems];
    result.sort((a, b) => a.title.localeCompare(b.title));
    this.filteredTransferData = result;
  }

  handelNameSearch(direction: string): TransferItem[] {
    // handel name search
    const searchValue = this.getSearchValue(direction);
    // filter the items that match the search value
    const filteredItems = this.transferData.filter(item => {
      if (item.direction !== direction) {
        // If not the current direction, skip filtering
        return false;
      }
      return item.title.toLowerCase().includes(searchValue.toLowerCase());
    });
    return filteredItems;
  }

  handelLabelSearch(direction: string): TransferItem[] {
    // handel label search
    const filterLabels = this.getFilterLabels(direction);
    if (filterLabels.length === 0) {
      const filteredItems = this.transferData.filter(item => item.direction === direction);
      return filteredItems;
    }
    // filter the items that match the filter labels
    const filteredItems = this.transferData.filter(item => {
      if (item.direction !== direction) {
        // If not the current direction, skip filtering
        return false;
      }
      const labelSet = new Set(item.labels);
      return filterLabels.some(label => labelSet.has(label));
    });
    return filteredItems;
  }

  // end -- associate alert definition and monitoring model

  private cascadeValuesToExpr(values: string[]): string {
    if (!values || values.length < 2) return '';

    // Special handling for availability metrics
    if (values[1] === 'availability') {
      return `equals(__app__,"${values[0]}") && equals(__available__,"down")`;
    }

    return `equals(__app__,"${values[0]}") && equals(__metrics__,"${values[1]}")`;
  }

  public exprToCascadeValues(expr: string | undefined): string[] {
    const values: string[] = [];
    if (!expr) {
      return values;
    }
    const appMatch = expr.match(/equals\(__app__,"([^"]+)"\)/);
    const metricMatch = expr.match(/equals\(__metrics__,"([^"]+)"\)/);
    const availabilityMatch = expr.match(/equals\(__available__,"down"\)/);
    if (!appMatch) {
      return values;
    }
    values.push(appMatch[1]);
    // If availability expression exists, add 'availability'
    if (availabilityMatch) {
      values.push('availability');
    } else if (metricMatch) {
      values.push(metricMatch[1]);
    }
    return values;
  }

  // Remove app/metric/availability and monitor binding expressions
  private exprToUserExpr(expr: string | undefined): string {
    if (!expr) return '';

    return (
      expr
        // Remove app/metric/availability expressions
        .replace(/equals\(__app__,"[^"]+"\)\s*&&\s*/, '')
        .replace(/equals\(__metrics__,"[^"]+"\)\s*&&\s*/, '')
        .replace(/equals\(__availabile__,"down"\)\s*&&\s*/, '')
        // Remove monitor binding expressions - both single and multiple
        .replace(/&&\s*\(?(equals\(__instance__,\s*"\d+"\)(\s*or\s*equals\(__instance__,\s*"\d+"\))*)\)?/, '')
        .replace(/\(?(equals\(__instance__,\s*"\d+"\)(\s*or\s*equals\(__instance__,\s*"\d+"\))*)\)?\s*&&\s*/, '')
        // Clean up any remaining && at start/end
        .replace(/^\s*&&\s*/, '')
        .replace(/\s*&&\s*$/, '')
        // Remove monitor label binding expressions
        .replace(/&&\s*\(?(contains\(__labels__,\s*"[^"]+"\)(\s*or\s*contains\(__labels__,\s*"[^"]+"\))*)\)?/, '')
        .replace(/\(?(contains\(__labels__,\s*"[^"]+"\)(\s*or\s*contains\(__labels__,\s*"[^"]+"\))*)\)?\s*&&\s*/, '')
    );
  }

  private tryParseThresholdExpr(expr: string | undefined): void {
    if (!expr || !expr.trim()) {
      this.resetQbDataDefault();
      this.isExpr = false;
      return;
    }

    try {
      // First try to parse as visual rules
      const ruleset = this.expr2ruleset(expr);
      if (ruleset && ruleset.rules && ruleset.rules.length > 0) {
        this.resetQbData(ruleset);
        this.isExpr = false;
        return;
      }

      // If cannot parse as visual rules, switch to expression mode
      this.isExpr = true;
    } catch (e) {
      console.warn('Failed to parse threshold expr:', e);
      this.notifySvc.error('Parse threshold expr to visual error', '');
      this.isExpr = true;
    }
  }

  public updateFinalExpr(): void {
    const baseExpr = this.cascadeValuesToExpr(this.cascadeValues);
    const monitorBindExpr = this.generateMonitorBindExpr();
    const monitorLabelBindExpr = this.generateMonitorLabelBindExpr();
    let thresholdExpr = '';
    if (this.cascadeValues.length >= 2 && this.cascadeValues[1] !== 'availability') {
      thresholdExpr = this.userExpr;
    }
    const exprList = [baseExpr, monitorBindExpr, monitorLabelBindExpr, thresholdExpr].filter(e => e);

    this.define.expr = exprList.length > 1 ? exprList.join(' && ') : exprList[0];
  }

  onEnvVarClick(env: { name: string; description?: string; value?: string }) {
    // Insert environment variable at cursor position
    const textarea = document.getElementById('template') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end);
      if (env.value) {
        env.name = `\${${env.value}}`;
      }

      this.define.template = `${before} ${env.name} ${after}`;

      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + env.name.length + 2;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      });
    }
  }

  // Handle variable click event
  onExprVarClick(item: { value: string; description?: string }) {
    const textarea = document.getElementById('expr') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end);

      // Special handling for brackets
      let insertText = item.value;
      if (item.value === '()') {
        insertText = '()';
        // If text is selected, wrap it with brackets
        if (start !== end) {
          insertText = `(${text.substring(start, end)})`;
        }
      }

      this.userExpr = `${before} ${insertText} ${after}`;

      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        const newPos =
          item.value === '()' && start === end
            ? start + 1 // Place cursor between brackets
            : start + insertText.length + 2; // Place cursor after inserted content
        textarea.setSelectionRange(newPos, newPos);
      });
    }
  }

  // Parse monitor IDs from expression
  private parseMonitorIdsFromExpr(expr: string) {
    const idPattern = /equals\(__instance__,\s*"(\d+)"\)/g;
    let match;
    this.selectedMonitorIds.clear();
    while ((match = idPattern.exec(expr)) !== null) {
      this.selectedMonitorIds.add(Number(match[1]));
    }
  }

  // Parse label from expression
  private parseLabelFromExpr(expr: string) {
    const labelPattern = /contains\(__labels__,\s*"([^"]+)"\)/g;
    let match;
    this.selectedLabels.clear();
    while ((match = labelPattern.exec(expr)) !== null) {
      this.selectedLabels.add(match[1]);
    }
  }

  // Generate monitor binding expression
  private generateMonitorBindExpr(): string {
    if (this.selectedMonitorIds.size === 0) return '';
    const idExprs = Array.from(this.selectedMonitorIds)
      .map(id => `equals(__instance__, "${id}")`)
      .join(' or ');
    return this.selectedMonitorIds.size > 1 ? `(${idExprs})` : idExprs;
  }

  // Generate monitor label binding expression
  private generateMonitorLabelBindExpr(): string {
    if (this.selectedLabels.size === 0) return '';
    const labelExprs = Array.from(this.selectedLabels)
      .map(label => `contains(__labels__, "${label}")`)
      .join(' or ');
    return this.selectedLabels.size > 1 ? `(${labelExprs})` : labelExprs;
  }

  // Load monitor binds
  showConnectModal() {
    if (this.cascadeValues.length < 2) {
      this.notifySvc.warning(this.i18nSvc.fanyi('alert.setting.bind.need-save'), '');
      return;
    }
    // Parse monitor IDs from expr first
    if (this.define.expr) {
      this.parseMonitorIdsFromExpr(this.define.expr);
      this.parseLabelFromExpr(this.define.expr);
    }
    this.monitorSvc.getMonitorsByApp(this.cascadeValues[0]).subscribe(message => {
      if (message.code === 0) {
        const monitors = message.data;
        // Create transfer items with direction based on selectedMonitorIds
        this.transferData = monitors.map(item => ({
          key: item.id,
          title: item.name,
          description: item.host,
          direction: this.selectedMonitorIds.has(item.id) ? 'right' : 'left',
          labels: Object.entries(item.labels).map(([key, value]) => `${key}:${value}`)
        }));
        this.updateMonitorLabel();
        this.filteredTransferData = [...this.transferData];
      }
    });
    this.isConnectModalVisible = true;
  }
  onFilterChange(): void {
    this.pageIndex = 1;
    this.loadAlertDefineTable();
  }

  onDragStart(event: DragEvent, data: any): void {
    if (!event.dataTransfer) return;

    let dragText: string;
    if (this.isMetric(data)) {
      dragText = `\${${data.value}}`;
    } else {
      dragText = data.name;
    }

    event.dataTransfer.setData('text/plain', dragText);

    (event.target as HTMLElement).classList.add('dragging-active');
    this.saveTextareaSelection();
  }

  @HostListener('document:dragend', ['$event'])
  onGlobalDragEnd() {
    document.querySelectorAll('.dragging-active').forEach(el => {
      el.classList.remove('dragging-active');
    });
  }

  private isMetric(data: any): boolean {
    return 'value' in data && 'label' in data;
  }

  private saveTextareaSelection(): void {
    const textarea = document.getElementById('template') as HTMLTextAreaElement;
    this.savedSelectionStart = textarea.selectionStart;
    this.savedSelectionEnd = textarea.selectionEnd;
  }

  onTextareaDrop(event: DragEvent): void {
    event.preventDefault();

    if (!event.dataTransfer) return;

    const textarea = event.target as HTMLTextAreaElement;
    const data = event.dataTransfer.getData('text/plain');
    this.insertAtCursor(textarea, data);
    this.define.template = textarea.value;
  }

  private insertAtCursor(textarea: HTMLTextAreaElement, text: string): void {
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;

    const content = textarea.value;
    textarea.value = content.substring(0, startPos) + text + content.substring(endPos, content.length);

    const newPos = startPos + text.length;
    textarea.selectionStart = newPos;
    textarea.selectionEnd = newPos;
  }

  onTextareaDragOver(event: DragEvent): void {
    event.preventDefault();
    (event.target as HTMLElement).classList.add('drag-over');
  }

  onTextareaDragLeave(event: DragEvent): void {
    (event.target as HTMLElement).classList.remove('drag-over');
  }

  get monitorDataByLabel(): any[] {
    return this.transferData
      .filter(item => item.labels.some((label: string) => this.selectedLabels.has(label)))
      .map(item => ({
        key: item.key,
        title: item.title,
        description: item.description,
        labels: item.labels
      }));
  }

  onPreviewExpr(): void {
    if (!this.define.expr) {
      this.clearPreview();
      this.previewTableLoading = false;
      return;
    }
    this.previewTableLoading = true;
    const COLUMNS = [{ title: 'metric', key: 'metric_data' } as any, { title: 'value', key: '__value__', width: '120px' } as any];
    this.alertDefineSvc.getMonitorsDefinePreview(this.define.datasource, this.define.type, this.define.expr).subscribe({
      next: res => {
        if (res.code === 15 || res.code === 1 || res.code === 4) {
          this.message.error(res.msg || 'Expression parsing exception');
          this.clearPreview();
          this.previewTableLoading = false;
          return;
        }
        if (res.code === 0 && Array.isArray(res.data)) {
          this.previewColumns = COLUMNS;
          this.previewData = res.data.reduce((acc, item) => {
            const processedItem = this.filterEmptyFields(item);

            if (processedItem.__value__ == null) return acc;

            const labels: string[] = [];
            let metricName = '';

            for (const [key, value] of Object.entries(processedItem)) {
              if (key === '__value__') continue;
              if (key === '__name__') {
                metricName = String(value);
              } else {
                labels.push(`${key}="${value}"`);
              }
            }

            const metric = metricName ? (labels.length > 0 ? `${metricName}{${labels.join(', ')}}` : metricName) : `{${labels.join(', ')}}`;

            acc.push({
              metric_data: metric,
              __value__: processedItem.__value__
            });

            return acc;
          }, [] as any[]);

          if (this.previewData.length === 0) {
            this.previewData = [];
          }
        } else {
          this.clearPreview();
        }
        this.previewTableLoading = false;
      },
      error: err => {
        this.clearPreview();
        this.previewTableLoading = false;
        this.message.error('Failed to get preview data.');
      }
    });
  }

  private filterEmptyFields(mapData: Record<string, any>): Record<string, any> {
    return Object.entries(mapData).reduce<Record<string, any>>((acc, [key, value]) => {
      if (value == null) return acc;
      if (typeof value === 'string' && value.trim() === '') return acc;
      acc[key] = value;
      return acc;
    }, {});
  }

  private clearPreview(): void {
    this.previewData = [];
    this.previewColumns = [];
  }
}
