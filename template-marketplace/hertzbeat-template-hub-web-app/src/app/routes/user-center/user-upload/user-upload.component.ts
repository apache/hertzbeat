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

import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormBuilder} from '@angular/forms';
import {NzMessageService} from 'ng-zorro-antd/message';
import {NzUploadChangeParam, NzUploadFile} from 'ng-zorro-antd/upload';
import {finalize, window} from 'rxjs';

import {TemplateService} from '../../../service/template.service';

import {CategoryService} from "../../../service/category.service";
import {LocalStorageService} from "../../../service/local-storage.service";

interface TemplateInfo {
  id: number;
  name: string;
  description: string;
  descriptionVersion: string;
  latest: number;
  versions: string[];
  currentVersion: string;
  user: string;
  userId: number;
  category: string;
  categoryId: number;
  download: number;
  star:number,
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
export class UserUploadComponent implements OnInit,OnDestroy {
  constructor(fb: FormBuilder,
              private templateService: TemplateService,
              private msg: NzMessageService,
              private categoryService: CategoryService,
              private localStorageService: LocalStorageService,) {}

  userId:number=0;

  error = 'success';
  type = 0;
  loading = false;

  count = 0;
  interval$: any;

  fileList: NzUploadFile[] = [];
  file: any[] = [];
  uniqueFile:any=null;

  templateInfo = {
    id: 0,
    name: '',
    description: '模版描述',
    descriptionVersion: '首版描述',
    latest: 0,
    currentVersion: 'v1.0.0',
    user: 'user',
    userId: 1,
    category: '',
    categoryId: 0,
    download: 0,
    star:0,
    create_time: '2024',
    update_time: '2024',
    off_shelf: 0,
    is_del: 0
  } as TemplateInfo;

  categoryList = [
    { label: '数据库监控模版', value: 1, checked: true },
    { label: '应用服务监控模版', value: 2, checked: false },
  ];

  ngOnInit(): void {
    const user=this.localStorageService.getData("userId");
    const userName=this.localStorageService.getData("userInfo");
    if(user==null) this.userId=0;
    else this.userId=parseInt(user);
    this.templateInfo.userId=this.userId;
    this.templateInfo.user=userName==null?'user':userName;

    this.categoryList=[];
    this.categoryService.clearCategoryList();
    this.categoryService.getAllCategoryByIsDel(0).subscribe(message => {
      if (message.code == 0) {
        for (const item of message.data) {
          this.categoryList.push({label: item.description, value: item.id, checked:true});
        }
        this.localStorageService.putData('categoryList',JSON.stringify(this.categoryList));
      }else{
        this.msg.error('类别请求失败：'+message.msg);
      }
    })
  }

  getCategoryStr(value:number):string{
    for (const item of this.categoryList) {
      if(item.value==value){
        return item.label;
      }
    }
    return ' '
  }

  ngOnDestroy(): void {
    if (this.interval$) {
      clearInterval(this.interval$);
    }
  }

  handleChange(info: NzUploadChangeParam) {
    if (info.file.status !== 'uploading') {
      const isLt4M = info.file.size! / 1024 / 1024 < 4;
      if (!isLt4M) {
        // this.message.error('Message.File.SizeFile');
        console.log('error:文件超过4M');
      }
      // this.file = this.file.concat(info.file);
    }
    if (info.file.status === 'done') {
      this.file.pop();
      this.fileList.reverse()
      if(this.fileList.length > 1) {
        this.fileList.pop()
      }
      // this.msg.success(`${info.file.name} file uploaded successfully`);
    } else if (info.file.status === 'error') {
      this.fileList=[];
      // this.msg.error(`${info.file.name} file upload failed.`);
    }
  }

  beforeUpload = (file: any) => {
    this.file.push(file);
    this.uniqueFile=file;
    this.fileList=[]
    return true;
  };

  uploadTemplate(): void {
    console.log('ss',this.file, this.fileList);
    console.log(this.uniqueFile)
    if(this.uniqueFile==null){
      this.msg.error("文件为空");
      return;
    }
    const formData = new FormData();
    if (this.uniqueFile != null) {
      formData.append('file', this.uniqueFile);
      this.templateInfo.category=this.getCategoryStr(this.templateInfo.categoryId)
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
              this.fileList=[]
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
