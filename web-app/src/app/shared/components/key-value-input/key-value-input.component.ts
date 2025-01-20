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

import { Component, forwardRef, Input, OnInit } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-key-value-input',
  templateUrl: './key-value-input.component.html',
  styleUrls: ['./key-value-input.component.less'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => KeyValueInputComponent),
      multi: true
    }
  ]
})
export class KeyValueInputComponent implements OnInit, ControlValueAccessor {
  constructor() {}

  @Input()
  keyAlias: string = 'Key';
  @Input()
  valueAlias: string = 'Value';

  keyValues: any[] = [];

  // ControlValueAccessor
  private onChange: any = () => {};
  private onTouched: any = () => {};

  ngOnInit(): void {
    if (this.keyValues.length === 0) {
      this.addNew();
    }
  }

  writeValue(obj: string): void {
    if (obj != undefined) {
      let value = JSON.parse(obj);
      if (value != null) {
        this.keyValues = [];
        Object.keys(value).map(item => {
          this.keyValues.push({
            key: item,
            value: value[item]
          });
        });
      }
    }
    if (this.keyValues.length === 0) {
      this.addNew();
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // set disabled state here
  }

  addNew(e?: MouseEvent) {
    if (e) {
      e.preventDefault();
    }
    this.keyValues.push({
      key: '',
      value: ''
    });
  }

  removeCurrent(index: number, e?: MouseEvent) {
    if (e) {
      e.preventDefault();
    }
    if (this.keyValues.length > 1) {
      this.keyValues.splice(index, 1);
      this.emitChange();
    }
  }

  emitChange() {
    let value: Record<string, string> = {};
    this.keyValues.forEach(item => {
      if (item != null && item.key != null) {
        value[item.key] = item.value;
      }
    });
    if (Object.keys(value).length === 0 || Object.values(value).every(v => v === '')) {
      this.onChange(null);
    } else {
      this.onChange(JSON.stringify(value));
    }
    this.onTouched();
  }
}
