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

import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { TagItem } from '../../../pojo/NoticeRule';
import { Tag } from '../../../pojo/Tag';
import { TagService } from '../../../service/tag.service';

@Component({
  selector: 'app-tags-select',
  templateUrl: './tags-select.component.html',
  styleUrls: ['./tags-select.component.less'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TagsSelectComponent),
      multi: true
    }
  ]
})
export class TagsSelectComponent implements ControlValueAccessor {
  constructor(private tagSvc: TagService) {}

  @Input() value!: any;
  @Input() mode!: 'default' | 'closeable' | 'checkable';
  @Output() readonly valueChange = new EventEmitter<string>();

  isManageModalVisible = false;
  isManageModalOkLoading = false;
  checkedTags = new Set<Tag>();
  tagTableLoading = false;
  tagCheckedAll: boolean = false;
  tagSearch!: string;
  tags!: Tag[];

  _onChange = (_: any) => {};
  _onTouched = () => {};

  onChange(inputValue: any) {
    this.valueChange.emit(inputValue);
    this._onChange(inputValue);
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

  loadTagsTable() {
    this.tagTableLoading = true;
    let tagsReq$ = this.tagSvc.loadTags(this.tagSearch, 1, 0, 1000).subscribe(
      message => {
        this.tagTableLoading = false;
        this.tagCheckedAll = false;
        this.checkedTags.clear();
        if (message.code === 0) {
          let page = message.data;
          this.tags = page.content;
        } else {
          console.warn(message.msg);
        }
        tagsReq$.unsubscribe();
      },
      error => {
        this.tagTableLoading = false;
        tagsReq$.unsubscribe();
      }
    );
  }

  onRemoveTag(tag: TagItem) {
    if (this.value != undefined) {
      this.onChange(this.value.filter((item: TagItem) => item !== tag));
    }
  }

  sliceTagName(tag: any): string {
    if (tag.value != undefined && tag.value.trim() != '') {
      return `${tag.name}:${tag.value}`;
    } else {
      return tag.name;
    }
  }

  onShowTagsModal() {
    this.isManageModalVisible = true;
    this.loadTagsTable();
  }

  onManageModalCancel() {
    this.isManageModalVisible = false;
  }

  onManageModalOk() {
    this.isManageModalOkLoading = true;
    let value = this.value == undefined ? [] : this.value;
    this.checkedTags.forEach(item => {
      if (this.value.find((tag: { id: number }) => tag.id == item.id) == undefined) {
        value.push(item);
      }
    });
    this.onChange(value);
    this.isManageModalOkLoading = false;
    this.isManageModalVisible = false;
  }

  onAllChecked(checked: boolean) {
    if (checked) {
      this.tags.forEach(tag => this.checkedTags.add(tag));
    } else {
      this.checkedTags.clear();
    }
  }

  onItemChecked(tag: Tag, checked: boolean) {
    if (checked) {
      this.checkedTags.add(tag);
    } else {
      this.checkedTags.delete(tag);
    }
  }
}
