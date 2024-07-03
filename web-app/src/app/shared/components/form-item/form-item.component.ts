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

import { TagItem } from '../../../pojo/NoticeRule';
import { Tag } from '../../../pojo/Tag';
import { TagService } from '../../../service/tag.service';

@Component({
  selector: 'app-form-item',
  templateUrl: './form-item.component.html',
  styleUrls: ['./form-item.component.less']
})
export class FormItemComponent {
  constructor(private tagSvc: TagService) {}
  @Input() item!: any;
  @Input() value!: any;
  @Input() extra: any = {};
  @Output() readonly valueChange = new EventEmitter<any>();

  isManageModalVisible = false;
  isManageModalOkLoading = false;
  checkedTags = new Set<Tag>();
  tagTableLoading = false;
  tagCheckedAll: boolean = false;
  tagSearch!: string;
  tags!: Tag[];

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

  onChange(value: any) {
    this.valueChange.emit(value);
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
