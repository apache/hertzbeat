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
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN, TitleService } from '@delon/theme';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzUploadFile } from 'ng-zorro-antd/upload';
import { throwError } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';

import { Collector } from '../../../pojo/Collector';
import { GrafanaDashboard } from '../../../pojo/GrafanaDashboard';
import { Message } from '../../../pojo/Message';
import { Monitor } from '../../../pojo/Monitor';
import { Param } from '../../../pojo/Param';
import { ParamDefine } from '../../../pojo/ParamDefine';
import { Tag } from '../../../pojo/Tag';
import { AppDefineService } from '../../../service/app-define.service';
import { CollectorService } from '../../../service/collector.service';
import { MonitorService } from '../../../service/monitor.service';
import { TagService } from '../../../service/tag.service';

@Component({
  selector: 'app-monitor-modify',
  templateUrl: './monitor-edit.component.html',
  styles: []
})
export class MonitorEditComponent implements OnInit {
  constructor(
    private appDefineSvc: AppDefineService,
    private monitorSvc: MonitorService,
    private route: ActivatedRoute,
    private router: Router,
    private titleSvc: TitleService,
    private notifySvc: NzNotificationService,
    private tagSvc: TagService,
    private collectorSvc: CollectorService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  paramDefines!: ParamDefine[];
  hostName!: string;
  params!: Param[];
  advancedParamDefines!: ParamDefine[];
  advancedParams!: Param[];
  paramValueMap = new Map<String, Param>();
  monitor = new Monitor();
  grafanaDashboard!: GrafanaDashboard;
  collectors!: Collector[];
  collector: string = '';
  profileForm: FormGroup = new FormGroup({});
  detected: boolean = false;
  isSpinning: boolean = false;
  spinningTip: string = 'Loading...';

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((paramMap: ParamMap) => {
          this.isSpinning = true;
          let id = paramMap.get('monitorId');
          this.monitor.id = Number(id);
          // 查询监控信息
          return this.monitorSvc.getMonitor(this.monitor.id);
        })
      )
      .pipe(
        switchMap((message: Message<any>) => {
          if (message.code === 0) {
            this.monitor = message.data.monitor;
            this.collector = message.data.collector == null ? '' : message.data.collector;
            this.titleSvc.setTitleByI18n(`monitor.app.${this.monitor.app}`);
            if (message.data.params != null) {
              message.data.params.forEach((item: Param) => {
                this.paramValueMap.set(item.field, item);
              });
            }
            this.detected = false;
            if (this.monitor.tags == undefined) {
              this.monitor.tags = [];
            }
          } else {
            console.warn(message.msg);
            this.notifySvc.error(this.i18nSvc.fanyi('monitors.not-found'), message.msg);
            return throwError(this.i18nSvc.fanyi('monitors.not-found'));
          }
          return this.appDefineSvc.getAppParamsDefine(this.monitor.app);
        })
      )
      .pipe(
        switchMap(message => {
          if (message.code === 0) {
            this.params = [];
            this.advancedParams = [];
            this.paramDefines = [];
            this.advancedParamDefines = [];
            message.data.forEach(define => {
              let param = this.paramValueMap.get(define.field);
              if (param === undefined) {
                param = new Param();
                param.field = define.field;
                if (define.type === 'number') {
                  param.type = 0;
                } else if (define.type === 'key-value') {
                  param.type = 3;
                } else if (define.type === 'array') {
                  param.type = 4;
                } else {
                  param.type = 1;
                }
                if (define.type === 'boolean') {
                  param.paramValue = define.defaultValue == 'true';
                } else if (param.field === 'host') {
                  param.paramValue = this.monitor.host;
                } else if (define.defaultValue != undefined) {
                  if (define.type === 'number') {
                    param.paramValue = Number(define.defaultValue);
                  } else if (define.type === 'boolean') {
                    param.paramValue = define.defaultValue.toLowerCase() == 'true';
                  } else {
                    param.paramValue = define.defaultValue;
                  }
                }
              } else {
                if (define.type === 'boolean') {
                  if (param.paramValue != null) {
                    param.paramValue = param.paramValue.toLowerCase() == 'true';
                  } else {
                    param.paramValue = false;
                  }
                }
              }
              define.name = this.i18nSvc.fanyi(`monitor.app.${this.monitor.app}.param.${define.field}`);
              if (define.hide) {
                this.advancedParams.push(param);
                this.advancedParamDefines.push(define);
              } else {
                this.params.push(param);
                this.paramDefines.push(define);
              }
              if (
                define.field == 'host' &&
                define.type == 'host' &&
                define.name != `monitor.app.${this.monitor.app}.param.${define.field}`
              ) {
                this.hostName = define.name;
              }
            });
            this.onPageInit();
            this.detectDepend();
          } else {
            console.warn(message.msg);
          }
          return this.collectorSvc.getCollectors();
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.collectors = message.data.content?.map(item => item.collector);
          } else {
            console.warn(message.msg);
          }
          this.isSpinning = false;
        },
        error => {
          console.error(error);
          this.isSpinning = false;
        }
      );
  }

  onPageInit() {
    this.paramDefines.forEach((paramDefine, index) => {
      this.params[index].display = true;
    });
    this.advancedParamDefines.forEach((advancedParamDefine, index) => {
      this.advancedParams[index].display = true;
    });
  }

  detectDepend() {
    this.paramDefines.forEach((paramDefine, index) => {
      if (paramDefine.type == 'radio') {
        this.onDependChanged(this.paramValueMap.get(paramDefine.field)?.paramValue, paramDefine.field);
      }
    });
  }

  onParamBooleanChanged(booleanValue: boolean, field: string) {
    // 对SSL的端口联动处理, 不开启SSL默认80端口，开启SSL默认443
    if (field === 'ssl') {
      this.params.forEach(param => {
        if (param.field === 'port') {
          if (booleanValue) {
            param.paramValue = '443';
          } else {
            param.paramValue = '80';
          }
        }
      });
    }
  }

  onDependChanged(dependValue: string, dependField: string) {
    this.paramDefines.forEach((paramDefine, index) => {
      if (paramDefine.depend) {
        let fieldValues = new Map(Object.entries(paramDefine.depend)).get(dependField);
        if (fieldValues) {
          this.params[index].display = false;
          if (fieldValues.map(String).includes(dependValue)) {
            this.params[index].display = true;
          }
        }
      }
    });
    this.advancedParamDefines.forEach((advancedParamDefine, index) => {
      if (advancedParamDefine.depend) {
        let fieldValues = new Map(Object.entries(advancedParamDefine.depend)).get(dependField);
        if (fieldValues) {
          this.advancedParams[index].display = false;
          if (fieldValues.map(String).includes(dependValue)) {
            this.advancedParams[index].display = true;
          }
        }
      }
    });
  }

  onSubmit(formGroup: FormGroup) {
    if (formGroup.invalid) {
      Object.values(formGroup.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }
    this.monitor.host = this.monitor.host.trim();
    this.monitor.name = this.monitor.name.trim();
    // todo 暂时单独设置host属性值
    this.params.forEach(param => {
      if (param.field === 'host') {
        param.paramValue = this.monitor.host;
      }
      if (param.paramValue != null && typeof param.paramValue == 'string') {
        param.paramValue = (param.paramValue as string).trim();
      }
    });
    this.advancedParams.forEach(param => {
      if (param.paramValue != null && typeof param.paramValue == 'string') {
        param.paramValue = (param.paramValue as string).trim();
      }
    });
    let addMonitor = {
      detected: this.detected,
      monitor: this.monitor,
      collector: this.collector,
      params: this.params.concat(this.advancedParams)
    };
    if (this.detected) {
      this.spinningTip = this.i18nSvc.fanyi('monitors.spinning-tip.detecting');
    } else {
      this.spinningTip = 'Loading...';
    }
    this.isSpinning = true;
    this.monitorSvc.editMonitor(addMonitor).subscribe(
      message => {
        this.isSpinning = false;
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('monitors.edit.success'), '');
          this.router.navigateByUrl(`/monitors?app=${this.monitor.app}`);
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('monitors.edit.failed'), message.msg);
        }
      },
      error => {
        this.isSpinning = false;
        this.notifySvc.error(this.i18nSvc.fanyi('monitors.edit.failed'), error.msg);
      }
    );
  }

  onDetect(formGroup: FormGroup) {
    if (formGroup.invalid) {
      Object.values(formGroup.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }
    this.monitor.host = this.monitor.host.trim();
    this.monitor.name = this.monitor.name.trim();
    // todo 暂时单独设置host属性值
    this.params.forEach(param => {
      if (param.field === 'host') {
        param.paramValue = this.monitor.host;
      }
      if (param.paramValue != null && typeof param.paramValue == 'string') {
        param.paramValue = (param.paramValue as string).trim();
      }
    });
    this.advancedParams.forEach(param => {
      if (param.paramValue != null && typeof param.paramValue == 'string') {
        param.paramValue = (param.paramValue as string).trim();
      }
    });
    let detectMonitor = {
      detected: this.detected,
      monitor: this.monitor,
      collector: this.collector,
      params: this.params.concat(this.advancedParams)
    };
    this.spinningTip = this.i18nSvc.fanyi('monitors.spinning-tip.detecting');
    this.isSpinning = true;
    this.monitorSvc.detectMonitor(detectMonitor).subscribe(
      message => {
        this.isSpinning = false;
        if (message.code === 0) {
          this.notifySvc.success(this.i18nSvc.fanyi('monitors.detect.success'), '');
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('monitors.detect.failed'), message.msg);
        }
      },
      error => {
        this.isSpinning = false;
        this.notifySvc.error(this.i18nSvc.fanyi('monitors.detect.failed'), error.msg);
      }
    );
  }

  onCancel() {
    let app = this.monitor.app;
    app = app ? app : '';
    this.router.navigateByUrl(`/monitors?app=${app}`);
  }

  onRemoveTag(tag: Tag) {
    if (this.monitor != undefined && this.monitor.tags != undefined) {
      this.monitor.tags = this.monitor.tags.filter(item => item !== tag);
    }
  }

  sliceTagName(tag: Tag): string {
    if (tag.tagValue != undefined && tag.tagValue.trim() != '') {
      return `${tag.name}:${tag.tagValue}`;
    } else {
      return tag.name;
    }
  }

  // start Tag model
  isManageModalVisible = false;
  isManageModalOkLoading = false;
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
    this.isManageModalVisible = true;
    this.loadTagsTable();
  }
  onManageModalCancel() {
    this.isManageModalVisible = false;
  }
  onManageModalOk() {
    this.isManageModalOkLoading = true;
    this.checkedTags.forEach(item => {
      if (this.monitor.tags.find(tag => tag.id == item.id) == undefined) {
        this.monitor.tags.push(item);
      }
    });
    this.isManageModalOkLoading = false;
    this.isManageModalVisible = false;
  }
  onAllChecked(checked: boolean) {
    if (checked) {
      this.tags.forEach(tag => this.checkedTags.add(tag));
    } else {
      this.checkedTags.clear();
    }
  }
  onItemChecked(tag: Tag, checked: boolean) {
    if (checked) {
      this.checkedTags.add(tag);
    } else {
      this.checkedTags.delete(tag);
    }
  }
  // end tag model

  //start grafana
  handleTemplateInput(event: any): any {
    if (event.file && event.file.originFileObj) {
      const fileReader = new FileReader();
      fileReader.readAsText(event.file.originFileObj, 'UTF-8');
      fileReader.onload = () => {
        this.grafanaDashboard.template = fileReader.result as string;
      };
      fileReader.onerror = error => {
        console.log(error);
      };
    }
  }
}
