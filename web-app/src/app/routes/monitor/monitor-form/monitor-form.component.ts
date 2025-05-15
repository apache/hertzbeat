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

import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, Inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzNotificationService } from 'ng-zorro-antd/notification';

import { Collector } from '../../../pojo/Collector';
import { Monitor } from '../../../pojo/Monitor';
import { Param } from '../../../pojo/Param';
import { ParamDefine } from '../../../pojo/ParamDefine';

@Component({
  selector: 'app-monitor-form',
  templateUrl: './monitor-form.component.html',
  styleUrls: ['./monitor-form.component.less']
})
export class MonitorFormComponent implements OnChanges {
  @Input() monitor!: Monitor;
  @Input() grafanaDashboard!: any;
  @Input() loading!: boolean;
  @Input() loadingTip!: string;
  @Input() hostName!: string;
  @Input() collector!: string;
  @Input() collectors!: Collector[];
  @Input() params!: Param[];
  @Input() advancedParams!: Param[];
  @Input() paramDefines!: ParamDefine[];
  @Input() advancedParamDefines!: ParamDefine[];
  @Input() paramValueMap!: Map<String, Param>;
  @Input() sdDefines!: ParamDefine[];
  @Input() sdParams!: Param[];
  @Input() labelKeys!: string[];
  @Input() labelMap!: { [key: string]: string[] };

  @Output() readonly formSubmit = new EventEmitter<any>();
  @Output() readonly formCancel = new EventEmitter<any>();
  @Output() readonly formDetect = new EventEmitter<any>();
  @Output() readonly hostChange = new EventEmitter<string>();
  @Output() readonly scrapeChange = new EventEmitter<string>();
  @Output() readonly collectorChange = new EventEmitter<string>();

  hasAdvancedParams: boolean = false;

  constructor(private notifySvc: NzNotificationService, @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes.advancedParams && changes.advancedParams.currentValue !== changes.advancedParams.previousValue) {
      for (const advancedParam of changes.advancedParams.currentValue) {
        if (advancedParam.display !== false) {
          this.hasAdvancedParams = true;
          break;
        }
      }
    }
    if (changes.paramDefines && changes.paramDefines.currentValue !== changes.paramDefines.previousValue) {
      changes.paramDefines.currentValue.forEach((paramDefine: any) => {
        if (paramDefine.type == 'radio') {
          this.onDependChanged(this.paramValueMap?.get(paramDefine.field)?.paramValue, paramDefine.field);
        } else if (paramDefine.type == 'boolean') {
          this.onParamBooleanChanged(this.paramValueMap?.get(paramDefine.field)?.paramValue, paramDefine.field);
        }
      });
    }
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
    this.monitor.host = this.monitor.host ? this.monitor.host.trim() : '';
    this.monitor.name = this.monitor.name.trim();
    // todo Set the host property value separately for now
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
    this.sdParams.forEach(param => {
      if (param.paramValue != null && typeof param.paramValue == 'string') {
        param.paramValue = (param.paramValue as string).trim();
      }
    });
    this.formDetect.emit({
      monitor: this.monitor,
      sdParams: this.sdParams,
      params: this.params,
      advancedParams: this.advancedParams,
      collector: this.collector
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
    this.monitor.host = this.monitor.host?.trim();
    this.monitor.name = this.monitor.name?.trim();
    // todo Set the host property value separately for now
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
    this.sdParams.forEach(param => {
      if (param.paramValue != null && typeof param.paramValue == 'string') {
        param.paramValue = (param.paramValue as string).trim();
      }
    });
    this.formSubmit.emit({
      monitor: this.monitor,
      sdParams: this.sdParams,
      params: this.params,
      advancedParams: this.advancedParams,
      collector: this.collector,
      grafanaDashboard: this.grafanaDashboard
    });
  }

  onCancel() {
    this.formCancel.emit();
  }

  onScrapeChange(scrape: string) {
    this.scrapeChange.emit(scrape);
  }

  onHostChange(host: string) {
    this.hostChange.emit(host);
  }

  onParamBooleanChanged(booleanValue: boolean, field: string) {
    if (this.monitor.app === 'api') {
      if (field === 'ssl') {
        const portParam = this.params.find(param => param.field === 'port');
        if (portParam) {
          if (booleanValue && (portParam.paramValue == null || parseInt(portParam.paramValue) === 80)) {
            portParam.paramValue = 443;
            this.notifySvc.info(this.i18nSvc.fanyi('common.notice'), this.i18nSvc.fanyi('monitor.new.notify.change-to-https'));
          }
          if (!booleanValue && (portParam.paramValue == null || parseInt(portParam.paramValue) === 443)) {
            portParam.paramValue = 80;
            this.notifySvc.info(this.i18nSvc.fanyi('common.notice'), this.i18nSvc.fanyi('monitor.new.notify.change-to-http'));
          }
        }
      }
    } else if (this.monitor.app === 'ftp') {
      if (field === 'ssl') {
        const portParam = this.params.find(param => param.field === 'port');
        if (portParam) {
          if (booleanValue && (portParam.paramValue == null || parseInt(portParam.paramValue) === 21)) {
            portParam.paramValue = 22;
            this.notifySvc.info(this.i18nSvc.fanyi('common.notice'), this.i18nSvc.fanyi('monitor.new.notify.change-to-sftp'));
          }
          if (!booleanValue && (portParam.paramValue == null || parseInt(portParam.paramValue) === 22)) {
            portParam.paramValue = 21;
            this.notifySvc.info(this.i18nSvc.fanyi('common.notice'), this.i18nSvc.fanyi('monitor.new.notify.change-to-ftp'));
          }
        }
      }
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
    this.sdDefines.forEach((paramDefine, index) => {
      if (paramDefine.depend) {
        let fieldValues = new Map(Object.entries(paramDefine.depend)).get(dependField);
        if (fieldValues) {
          this.sdParams[index].display = false;
          if (fieldValues.map(String).includes(dependValue)) {
            this.sdParams[index].display = true;
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
