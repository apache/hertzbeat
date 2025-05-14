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

import { Component, Input, forwardRef, Output, EventEmitter } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-label-selector',
  templateUrl: './label-selector.component.html',
  styleUrls: ['./label-selector.component.less'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LabelSelectorComponent),
      multi: true
    }
  ]
})
export class LabelSelectorComponent implements ControlValueAccessor {
  @Input() name!: string;
  @Input() id!: string;
  @Input() labelKeys: string[] = [];
  @Input() labelMap: { [key: string]: string[] } = {};

  value: Array<{ key: string; value: string }> = [];
  customInputKey: string = '';
  customInputValue: string = '';

  _onChange = (_: any) => {};
  _onTouched = () => {};

  writeValue(value: any): void {
    this.value = value && value.length > 0 ? value : [{ key: '', value: '' }];
  }

  onKeyChange(index: number, value: string) {
    this.value[index].value = '';
    this._onChange(this.value);
    this._onTouched();
  }

  onValueChange(index: number, value: string) {
    this._onChange(this.value);
    this._onTouched();
  }

  onSearch(value: string, index: number, type: 'key' | 'value'): void {
    if (value) {
      if (type === 'key') {
        this.customInputKey = value;
      } else {
        this.customInputValue = value;
      }
    }
  }

  hasMatchingOption(value: string, options: string[]): boolean {
    return options.some(option => option.toLowerCase() === value.toLowerCase());
  }

  getLabelValues(key: string): string[] {
    return this.labelMap[key] || [];
  }

  addItem(event: MouseEvent): void {
    event.preventDefault();
    this.value.push({ key: '', value: '' });
    this._onChange(this.value);
    this._onTouched();
  }

  removeItem(index: number, event: MouseEvent): void {
    event.preventDefault();
    this.value.splice(index, 1);
    this._onChange(this.value);
    this._onTouched();
  }

  registerOnChange(fn: any): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this._onTouched = fn;
  }
}
