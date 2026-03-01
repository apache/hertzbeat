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

import { Component, EventEmitter, Input, Output, ContentChild, TemplateRef, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NzSizeLDSType } from 'ng-zorro-antd/core/types';

@Component({
  selector: 'app-multi-func-input',
  templateUrl: './multi-func-input.component.html',
  styleUrls: ['./multi-func-input.component.less'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MultiFuncInputComponent),
      multi: true
    }
  ]
})
export class MultiFuncInputComponent implements ControlValueAccessor {
  constructor() {}

  @ContentChild('prefix', { static: true }) prefix: TemplateRef<any> | undefined;
  @ContentChild('suffix', { static: true }) suffix: TemplateRef<any> | undefined;
  @Input() prefixIcon!: string;
  @Input() suffixIcon!: string;
  @Input() id!: string;
  @Input() value!: any;
  @Input() name!: string;
  @Input() required!: boolean;
  @Input() readonly!: boolean;
  @Input() groupStyle!: string;
  @Input() inputStyle!: string;
  @Input() placeholder!: string;
  @Input() allowClear: boolean = true;
  @Input() type: string = 'text';
  @Input() size: NzSizeLDSType = 'default';
  @Output() readonly valueChange = new EventEmitter<string>();
  @Output() readonly cleared = new EventEmitter<void>();

  disabled: boolean = false;
  passwordVisible: boolean = false;

  _onChange = (_: any) => {};
  _onTouched = () => {};

  onChange(inputValue: any) {
    this.valueChange.emit(inputValue);
    this._onChange(inputValue);
  }

  onClear(event: any) {
    event.stopPropagation();
    this.onChange((this.value = null));
    this.cleared.emit();
  }

  writeValue(value: any): void {
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this._onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
