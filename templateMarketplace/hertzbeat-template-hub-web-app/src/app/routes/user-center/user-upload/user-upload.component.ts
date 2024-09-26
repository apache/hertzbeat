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

import {Component, OnDestroy} from '@angular/core';
import {FormBuilder} from '@angular/forms';
import {NzMessageService} from 'ng-zorro-antd/message';
import {NzTabChangeEvent} from 'ng-zorro-antd/tabs';
import {NzUploadChangeParam, NzUploadFile} from 'ng-zorro-antd/upload';
import {window} from 'rxjs';
import {finalize} from 'rxjs/operators';

import {TemplateService} from '../../../service/template.service';

interface TemplateInfo {
  id: number;
  name: string;
  description: string;
  descriptionVersion: string;
  latest: string;
  versions: string[];
  currentVersion: string;
  user: string;
  userId: number;
  category: string;
  categoryId: number;
  download: number;
  create_time: string;
  update_time: string;
  off_shelf: number;
  is_del: number;
}

@Component({
  selector: 'user-upload',
  templateUrl: './user-upload.component.html',
  styleUrls: ['./user-upload.component.less'],
})
export class UserUploadComponent implements OnDestroy {
  constructor(fb: FormBuilder,
              private templateService: TemplateService,
              private msg: NzMessageService
  ) {}

  error = '';
  type = 0;
  loading = false;

  count = 0;
  interval$: any;

  fileList: NzUploadFile[] = [];
  file: any[] = [];

  templateInfo = {
    id: 0,
    name: 'test5',
    description: 'test5',
    descriptionVersion: 'test5-v1.0.0',
    latest: 'v1.0.0',
    versions: ['a'],
    currentVersion: 'v1.0.0',
    user: 'user',
    userId: 1,
    category: 'c1',
    categoryId: 1,
    download: 1000,
    create_time: '2024',
    update_time: '2024',
    off_shelf: 0,
    is_del: 0
  } as TemplateInfo;

  switch({ index }: NzTabChangeEvent): void {
    this.type = index!;
  }

  ngOnDestroy(): void {
    if (this.interval$) {
      clearInterval(this.interval$);
    }
  }

  handleChange(info: NzUploadChangeParam) {
    if (info.file.status !== 'uploading') {
      console.log(info.file, info.fileList);

      const isLt4M = info.file.size! / 1024 / 1024 < 4;
      if (!isLt4M) {
        // this.message.error('Message.File.SizeFile');
        console.log('error:文件超过4M');
      }
      // this.file = this.file.concat(info.file);
    }
    if (info.file.status === 'done') {
      this.file.pop();
      // this.msg.success(`${info.file.name} file uploaded successfully`);
    } else if (info.file.status === 'error') {
      // this.msg.error(`${info.file.name} file upload failed.`);
    }
  }

  beforeUpload = (file: any) => {
    while (this.file.length > 0) {
      this.file.pop();
    }
    console.log('beforeUpload', file);
    this.file.push(file);
    console.log('afterUpload', this.file);
    return false;
  };

  customUpload = (file: any) => {
    console.log('customUpload');
  };

  uploadTemplate(): void {
    const formData = new FormData();
    if (this.file.length > 0) {
      formData.append('file', this.file[0]);

      formData.append('templateDto', JSON.stringify(this.templateInfo));
      const uploadTemplateRes$ = this.templateService
        .upload(formData)
        .pipe(
          finalize(() => {
            uploadTemplateRes$.unsubscribe();
            // this.tableLoading = false;
          })
        )
        .subscribe(
          message => {
            console.log('message', message);
            if (message.code === 0) {
              // this.notifySvc.success(this.i18nSvc.fanyi('common.notify.edit-success'), '');
              this.msg.success(`模版文件上传成功`);
            } else {
              this.msg.error(`模版上传失败:${message.msg}`);
              // this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), message.msg);
            }
            // this.loadAlertConvergeTable();
            // this.tableLoading = false;
          },
          error => {
            console.log('err', error);
            // this.tableLoading = false;
            // this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.msg);
            this.msg.error(`模版上传失败`, error.msg);
          }
        );
    }
  }

  protected readonly window = window;
}
