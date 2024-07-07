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

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { Collector } from '../../../pojo/Collector';
import { Param } from '../../../pojo/Param';
import { ParamDefine } from '../../../pojo/ParamDefine';

@Component({
  selector: 'app-monitor-form',
  templateUrl: './monitor-form.component.html',
  styleUrls: ['./monitor-form.component.less']
})
export class MonitorFormComponent {
  @Input() monitor!: any;
  @Input() loading!: boolean;
  @Input() loadingTip!: string;
  @Input() hostName!: string;
  @Input() collector!: string;
  @Input() collectors!: Collector[];
  @Input() params!: Param[];
  @Input() advancedParams!: Param[];
  @Input() paramDefines!: ParamDefine[];
  @Input() advancedParamDefines!: ParamDefine[];

  @Output() readonly formSubmit = new EventEmitter<any>();
  @Output() readonly formCancel = new EventEmitter<any>();
  @Output() readonly formDetect = new EventEmitter<any>();
  @Output() readonly hostChange = new EventEmitter<string>();

  constructor() {}

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
    this.formDetect.emit({ monitor: this.monitor, params: this.params, advancedParams: this.advancedParams });
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
    this.formSubmit.emit({ monitor: this.monitor, params: this.params, advancedParams: this.advancedParams });
  }

  onCancel() {
    this.formCancel.emit();
  }

  onHostChange(host: string) {
    this.hostChange.emit(host);
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
}
