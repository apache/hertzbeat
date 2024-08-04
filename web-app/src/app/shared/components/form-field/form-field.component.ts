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
import { AbstractControl, ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator } from '@angular/forms';

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

  value: any;
  validateStatus!: string;

  _onChange: Function = () => {};
  _onTouched: Function = () => {};

  writeValue(value: any): void {
    this.value = value;
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
    if (this.item.required && (value === null || value === undefined || value === '')) {
      this.validateStatus = 'error';
      return {
        required: {
          valid: false
        }
      };
    }
    this.validateStatus = '';
    return null;
  }

  onChange(value: any) {
    this._onChange(value);
  }
}
