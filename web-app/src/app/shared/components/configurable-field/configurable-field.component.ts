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

import { Component, Input } from '@angular/core';
import { AbstractControl, ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator } from '@angular/forms';

export interface FieldConfig {
  key: string;
  style?: string;
  required?: boolean;
  placeholder?: string;
  separatorAfter?: string;
  validators?: any[];
}

@Component({
  selector: 'app-configurable-field',
  templateUrl: './configurable-field.component.html',
  styleUrls: ['./configurable-field.component.less'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: ConfigurableFieldComponent
    },
    {
      provide: NG_VALIDATORS,
      multi: true,
      useExisting: ConfigurableFieldComponent
    }
  ]
})
export class ConfigurableFieldComponent implements ControlValueAccessor, Validator {
  constructor() {}
  @Input() configs!: FieldConfig[];
  @Input() name!: string;
  @Input() id!: string;

  value: any = [{}];
  validateStatus!: string;

  _onChange: Function = () => {};
  _onTouched: Function = () => {};

  writeValue(value: any): void {
    this.value = value && value.length > 0 ? value : [{}];
  }

  registerOnChange(fn: Function): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: Function): void {
    this._onTouched = fn;
  }

  validate(control: AbstractControl): ValidationErrors | null {
    let value = control?.value ?? [];
    for (let o of value) {
      for (let c of this.configs) {
        let v = o[c.key];
        if (c.required && (v === null || v === undefined || (typeof v === 'string' && v.trim() === ''))) {
          this.validateStatus = 'error';
          return {
            required: {
              valid: false
            }
          };
        }
      }
    }
    this.validateStatus = '';
    return null;
  }

  onChange(index: number, key: string, value: any) {
    this.value[index][key] = value;
    this._onChange(this.value);
    this._onTouched();
  }

  add(e?: MouseEvent) {
    if (e) {
      e.preventDefault();
    }
    this.value.push({});
    this._onChange(this.value);
  }

  del(index: number, e?: MouseEvent) {
    if (e) {
      e.preventDefault();
    }
    if (this.value.length > 1) {
      this.value.splice(index, 1);
    }
    this._onChange(this.value);
  }
}
