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

import { Component, Input, forwardRef, OnInit } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { LabelService } from '../../../service/label.service';

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
export class LabelSelectorComponent implements ControlValueAccessor, OnInit {
  @Input() name!: string;
  @Input() id!: string;
  @Input() labelKeys: string[] = [];
  @Input() labelMap: { [key: string]: string[] } = {};
  @Input() labelIsCustom: boolean = false;

  constructor(private labelSvc: LabelService) {}

  value: Array<{ key: string; value: string }> = [];
  customInputKey: string = '';
  customInputValue: string = '';
  // Track the active search input to prevent cross-row pollution of custom options
  activeSearchIndex: number | null = null;
  activeSearchType: 'key' | 'value' | null = null;

  _onChange = (_: any) => {};
  _onTouched = () => {};

  writeValue(value: any): void {
    // Validate and initialize: use valid array if provided, otherwise initialize with empty key-value pair
    if (!value || !Array.isArray(value) || value.length === 0) {
      this.value = [{ key: '', value: '' }];
      return;
    }
    this.value = value;
    // Build labelKeys and labelMap for autocomplete from the provided values
    this.value.forEach(item => {
      // Skip invalid items
      if (!item || typeof item !== 'object' || !item.key) {
        return;
      }

      const key = String(item.key).trim();
      const val = item.value ? String(item.value).trim() : '';
      // Skip empty keys
      if (!key) {
        return;
      }
      // Add new key to labelKeys
      if (!this.labelKeys.includes(key)) {
        this.labelKeys.push(key);
      }
      // Initialize value array for this key
      if (!this.labelMap[key]) {
        this.labelMap[key] = [];
      }
      // Add value to labelMap (with deduplication)
      if (val && !this.labelMap[key].includes(val)) {
        this.labelMap[key].push(val);
      }
    });
  }

  /**
   * Handle key change: clear the corresponding value and add new key to labelKeys for reuse
   */
  onKeyChange(index: number, value: string) {
    // Clear the value when key changes
    this.value[index].value = '';

    // Add new key to labelKeys so other rows can see this custom key
    if (value && !this.labelKeys.includes(value)) {
      this.labelKeys.push(value);
    }

    // Initialize value array for this key
    if (value && !this.labelMap[value]) {
      this.labelMap[value] = [];
    }

    this._onChange(this.value);
    this._onTouched();
  }

  /**
   * Handle value change: add new value to the corresponding key's labelMap for reuse
   */
  onValueChange(index: number, value: string) {
    const key = this.value[index].key;

    // Add new value to labelMap so other rows can see this custom value
    if (key && value && this.labelMap[key] && !this.labelMap[key].includes(value)) {
      this.labelMap[key].push(value);
    }

    this._onChange(this.value);
    this._onTouched();
  }

  /**
   * Handle search event: track the active input to ensure custom options only show in the corresponding field
   */
  onSearch(value: string, index: number, type: 'key' | 'value'): void {
    // Track the currently active search input
    this.activeSearchIndex = index;
    this.activeSearchType = type;

    if (value) {
      if (type === 'key') {
        this.customInputKey = value;
      } else {
        this.customInputValue = value;
      }
    } else {
      // Clear custom input value when search is empty
      if (type === 'key') {
        this.customInputKey = '';
      } else {
        this.customInputValue = '';
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

  ngOnInit(): void {
    if (!this.labelKeys || this.labelKeys.length == 0) {
      this.labelMap = {};
      this.labelKeys = [];
      this.loadLabels();
    }
  }

  loadLabels() {
    let labelsInit$ = this.labelSvc.loadLabels(undefined, undefined, 0, 9999).subscribe(
      message => {
        if (message.code === 0) {
          let page = message.data;
          this.labelKeys = [...new Set(page.content.map(label => label.name))];

          this.labelMap = {};

          page.content.forEach(label => {
            if (!this.labelMap[label.name]) {
              this.labelMap[label.name] = [];
            }

            if (label.tagValue && !this.labelMap[label.name].includes(label.tagValue)) {
              this.labelMap[label.name].push(label.tagValue);
            }
          });
        } else {
          console.warn(message.msg);
        }
        labelsInit$.unsubscribe();
      },
      error => {
        labelsInit$.unsubscribe();
        console.error(error.msg);
      }
    );
  }
}
