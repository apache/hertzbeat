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
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzTableQueryParams } from 'ng-zorro-antd/table';
import { NzUploadFile } from 'ng-zorro-antd/upload';
import { finalize } from 'rxjs/operators';

import { ParamDefine } from '../../../pojo/ParamDefine';
import { Plugin } from '../../../pojo/Plugin';
import { PluginService } from '../../../service/plugin.service';

@Component({
  selector: 'app-setting-plugins',
  templateUrl: './plugin.component.html'
})
export class SettingPluginsComponent implements OnInit {
  constructor(
    private notifySvc: NzNotificationService,
    private modal: NzModalService,
    private pluginService: PluginService,
    private fb: FormBuilder,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {
    this.pluginForm = this.fb.group({
      name: [null, [Validators.required]],
      jarFile: [null, [Validators.required]],
      enableStatus: [true, [Validators.required]]
    });
    this.lang = this.i18nSvc.defaultLang;
  }

  lang: string;
  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;
  plugins!: Plugin[];
  tableLoading: boolean = false;
  checkedTagIds = new Set<number>();
  // search by name
  search: string | undefined;
  fileList: NzUploadFile[] = [];
  pluginForm: FormGroup;

  ngOnInit(): void {
    this.loadPluginsTable();
  }

  sync() {
    this.loadPluginsTable();
  }

  beforeUpload = (file: NzUploadFile): boolean => {
    this.fileList = [file];
    this.pluginForm.patchValue({
      jarFile: file
    });
    return false;
  };

  fileRemove = (): boolean => {
    this.pluginForm.patchValue({
      jarFile: null
    });
    return true;
  };

  loadPluginsTable() {
    this.tableLoading = true;
    let pluginsInit$ = this.pluginService.loadPlugins(this.search, 1, this.pageIndex - 1, this.pageSize).subscribe(
      message => {
        this.tableLoading = false;
        this.checkedAll = false;
        this.checkedTagIds.clear();
        if (message.code === 0) {
          let page = message.data;
          this.plugins = page.content;
          this.pageIndex = page.number + 1;
          this.total = page.totalElements;
        } else {
          console.warn(message.msg);
        }
        pluginsInit$.unsubscribe();
      },
      error => {
        this.tableLoading = false;
        pluginsInit$.unsubscribe();
        console.error(error.msg);
      }
    );
  }

  updatePluginEnableStatus(plugin: Plugin) {
    plugin.enableStatus = !plugin.enableStatus;
    this.tableLoading = true;
    const updateDefine$ = this.pluginService
      .updatePluginStatus(plugin)
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
          this.loadPluginsTable();
          this.tableLoading = false;
        },
        error => {
          this.tableLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.msg);
        }
      );
  }

  onDeletePlugins() {
    if (this.checkedTagIds == null || this.checkedTagIds.size === 0) {
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
      nzOnOk: () => this.deletePlugins(this.checkedTagIds)
    });
  }

  onDeleteOnePlugin(pluginId: number) {
    let alerts = new Set<number>();
    alerts.add(pluginId);
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.deletePlugins(alerts)
    });
  }

  deletePlugins(pluginIds: Set<number>) {
    this.tableLoading = true;
    const deleteTags$ = this.pluginService.deletePlugins(pluginIds).subscribe(
      message => {
        deleteTags$.unsubscribe();
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
          this.updatePageIndex(pluginIds.size);
          this.loadPluginsTable();
        } else {
          this.tableLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), message.msg);
        }
      },
      error => {
        this.tableLoading = false;
        deleteTags$.unsubscribe();
        this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), error.msg);
      }
    );
  }

  updatePageIndex(delSize: number) {
    const lastPage = Math.max(1, Math.ceil((this.total - delSize) / this.pageSize));
    this.pageIndex = this.pageIndex > lastPage ? lastPage : this.pageIndex;
  }

  // begin: List multiple choice paging
  checkedAll: boolean = false;

  onAllChecked(checked: boolean) {
    if (checked) {
      this.plugins.forEach(monitor => this.checkedTagIds.add(monitor.id));
    } else {
      this.checkedTagIds.clear();
    }
  }

  onItemChecked(monitorId: number, checked: boolean) {
    if (checked) {
      this.checkedTagIds.add(monitorId);
    } else {
      this.checkedTagIds.delete(monitorId);
    }
  }

  onTablePageChange(params: NzTableQueryParams) {
    const { pageSize, pageIndex, sort, filter } = params;
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
    this.loadPluginsTable();
  }

  isManageModalVisible = false;
  isManageModalOkLoading = false;
  isManageModalAdd = true;

  onNewPlugin() {
    this.isManageModalVisible = true;
    this.isManageModalAdd = true;
  }

  onManageModalCancel() {
    this.isManageModalVisible = false;
  }

  onManageModalOk() {
    this.isManageModalOkLoading = true;
    if (this.pluginForm.valid) {
      const formData = new FormData();
      formData.append('name', this.pluginForm.get('name')?.value);
      formData.append('jarFile', this.fileList[0] as any);
      formData.append('enableStatus', this.pluginForm.get('enableStatus')?.value);
      const uploadPlugin$ = this.pluginService
        .uploadPlugin(formData)
        .pipe(
          finalize(() => {
            uploadPlugin$.unsubscribe();
            this.isManageModalOkLoading = false;
          })
        )
        .subscribe((message: any) => {
          if (message.code === 0) {
            this.isManageModalVisible = false;
            this.resetForm();
            this.notifySvc.success(this.i18nSvc.fanyi('common.notify.new-success'), '');
            this.loadPluginsTable();
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), message.msg);
          }
        });
    } else {
      Object.values(this.pluginForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      this.isManageModalOkLoading = false;
    }
  }

  resetForm(): void {
    this.pluginForm.reset({
      name: null,
      enableStatus: true
    });
    this.fileList = [];
  }

  params: any = {};
  paramDefines!: ParamDefine[];
  isEditPluginParamDefineModalVisible = false;

  onEditPluginParamDefine(pluginId: number) {
    const getPluginParamDefine$ = this.pluginService
      .getPluginParamDefine(pluginId)
      .pipe(
        finalize(() => {
          getPluginParamDefine$.unsubscribe();
        })
      )
      .subscribe((message: any) => {
        if (message.code === 0) {
          this.paramDefines = message.data.paramDefines.map((i: any) => {
            this.params[i.field] = {
              pluginMetadataId: pluginId,
              // Parameter type 0: number 1: string 2: encrypted string 3: json string mapped by map
              type: i.type === 'number' ? 0 : i.type === 'text' || i.type === 'string' ? 1 : i.type === 'json' ? 3 : 2,
              field: i.field,
              paramValue: this.getParamValue(message.data.pluginParams, i.field)
            };
            i.name = i.name[this.lang];
            return i;
          });
          this.isEditPluginParamDefineModalVisible = true;
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), message.msg);
        }
      });
  }

  onEditPluginParamDefineModalCancel() {
    this.isEditPluginParamDefineModalVisible = false;
  }

  onEditPluginParamDefineModalOk() {
    const savePluginParamDefine$ = this.pluginService
      .savePluginParamDefine(Object.values(this.params))
      .pipe(
        finalize(() => {
          savePluginParamDefine$.unsubscribe();
        })
      )
      .subscribe((message: any) => {
        if (message.code === 0) {
          this.isEditPluginParamDefineModalVisible = false;
          this.notifySvc.success(this.i18nSvc.fanyi('common.notify.edit-success'), '');
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), message.msg);
        }
      });
  }

  getParamValue(pluginParams: any[], field: string) {
    const pluginParam = (pluginParams || []).filter((i: any) => i.field === field);
    return pluginParam.length > 0 ? pluginParam[0].paramValue : null;
  }
}
