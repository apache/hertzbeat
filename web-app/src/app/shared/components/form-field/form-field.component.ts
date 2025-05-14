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

import { Component, Input, ViewChild } from '@angular/core';
import { AbstractControl, ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator } from '@angular/forms';

import { ConfigurableFieldComponent } from '../configurable-field/configurable-field.component';

@Component({
  selector: 'app-form-field',
  templateUrl: './form-field.component.html',
  styleUrls: ['./form-field.component.less'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: FormFieldComponent
    },
    {
      provide: NG_VALIDATORS,
      multi: true,
      useExisting: FormFieldComponent
    }
  ]
})
export class FormFieldComponent implements ControlValueAccessor, Validator {
  constructor() {}
  @Input() item!: any;
  @Input() extra: any = {};
  @ViewChild(ConfigurableFieldComponent) configurableField: ConfigurableFieldComponent | undefined;

  value: any;

  _onChange: Function = () => {};
  _onTouched: Function = () => {};

  writeValue(value: any): void {
    if (this.item.type === 'key-value' && value && typeof value === 'string') {
      // It is compatible with the key-value type data structure of existing data. For the conversion from the old to the new:
      // Old structure: "{"1":"2","3":"4"}"
      // New structure: [{key: "1", value: "2"}, {key: "3", value: "4"}]
      let tmpValue = JSON.parse(value);
      let newValue = [];
      for (let k in tmpValue) {
        newValue[newValue.length] = {
          key: k,
          value: tmpValue[k]
        };
      }
      this.value = newValue;
    } else if (this.item.type === 'labels' && value && !(value instanceof Array)) {
      // It is compatible with the lables type data structure of existing data. For the conversion from the old to the new:
      // Old structure: {1:"2", 3:"4"}
      // New structure: [{key: "1", value: "2"}, {key: "3", value: "4"}]
      let newValue = Object.entries(value).map(([key, value]) => ({
        key: String(key),
        value: String(value)
      }));
      this.value = newValue;
    } else if (this.item.type === 'label-selector' && value && !(value instanceof Array)) {
      let newValue = Object.entries(value).map(([key, value]) => ({
        key: String(key),
        value: String(value)
      }));
      this.value = newValue;
    } else {
      this.value = value;
    }
  }

  registerOnChange(fn: Function): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: Function): void {
    this._onTouched = fn;
  }

  validate(control: AbstractControl): ValidationErrors | null {
    // if (!(control.dirty) && !(control.touched)) return null;
    let { value } = control;
    if (
      this.item.required &&
      (value === null ||
        value === undefined ||
        (typeof value === 'string' && value.trim() === '') ||
        this.configurableField?.validateStatus === 'error')
    ) {
      return {
        required: {
          valid: false
        }
      };
    }
    return null;
  }

  onChange(value: any) {
    if (this.item.type === 'key-value' && value) {
      // It is compatible with the key-value type data structure of existing data. For the conversion from the new to the old:
      // Old structure: "{"1":"2","3":"4"}"
      // New structure: [{key: "1", value: "2"}, {key: "3", value: "4"}]
      const newValue: any = {};
      value.forEach((item: any) => {
        newValue[item.key] = item.value;
      });
      this._onChange(JSON.stringify(newValue));
    } else if ((this.item.type === 'labels' || this.item.type === 'label-selector') && value) {
      // It is compatible with the lables type data structure of existing data. For the conversion from the new to the old:
      // Old structure: {1:"2", 3:"4"}
      // New structure: [{key: "1", value: "2"}, {key: "3", value: "4"}]
      const newValue: any = {};
      value.forEach((item: any) => {
        if (!item || !item.key || item.key === '' || !item.value || item.value === '') {
          return;
        }
        newValue[item.key] = item.value;
      });
      this._onChange(newValue);
    } else {
      this._onChange(value);
    }
    this._onTouched();
  }
}
