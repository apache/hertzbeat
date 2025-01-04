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

import { Component, Input, OnInit, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

interface KeyValuePair {
  key: string;
  value: string;
}

@Component({
  selector: 'app-labels-input',
  templateUrl: './labels-input.component.html',
  styleUrl: './labels-input.component.less',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LabelsInputComponent),
      multi: true
    }
  ]
})
export class LabelsInputComponent implements OnInit, ControlValueAccessor {
  constructor() {}

  @Input() keyAlias: string = 'Key';
  @Input() valueAlias: string = 'Value';

  keyValues: KeyValuePair[] = [];

  // ControlValueAccessor
  private onChange: any = () => {};
  private onTouched: any = () => {};

  writeValue(value: Record<string, string>): void {
    this.keyValues = Object.entries(value || {}).map(([key, value]) => ({
      key,
      value
    }));

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

  ngOnInit(): void {
    if (this.keyValues.length === 0) {
      this.addNew();
    }
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
    const result: Record<string, string> = {};
    this.keyValues.forEach(item => {
      if (item.key?.trim()) {
        result[item.key] = item.value || '';
      }
    });
    if (Object.keys(result).length === 0 || Object.values(result).every(v => v === '')) {
      this.onChange(null);
    } else {
      this.onChange(result);
    }
    this.onTouched();
  }
}
