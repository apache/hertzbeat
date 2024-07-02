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

import {Component, EventEmitter, Inject, Input, OnInit, Output} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN, TitleService } from '@delon/theme';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { switchMap } from 'rxjs/operators';

import { Collector } from '../../../pojo/Collector';
import { Message } from '../../../pojo/Message';
import { Monitor } from '../../../pojo/Monitor';
import { Param } from '../../../pojo/Param';
import { ParamDefine } from '../../../pojo/ParamDefine';
import { AppDefineService } from '../../../service/app-define.service';
import { CollectorService } from '../../../service/collector.service';
import { MonitorService } from '../../../service/monitor.service';
import {finalize} from "rxjs";

@Component({
  selector: 'app-monitor-form',
  templateUrl: './monitor-form.component.html',
  styles: []
})
export class MonitorFormComponent implements OnInit {

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

  @Output() readonly submit = new EventEmitter<any>();
  @Output() readonly cancel = new EventEmitter<any>();
  @Output() readonly detect = new EventEmitter<any>();
  @Output() readonly hostChange = new EventEmitter<string>();

  constructor() {
  }

  ngOnInit(): void {
  }

  onDetect(formGroup: FormGroup) {
    this.detect.emit(formGroup);
  }

  onSubmit(formGroup: FormGroup) {
    this.submit.emit(formGroup);
  }

  onCancel() {
    this.cancel.emit();
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
