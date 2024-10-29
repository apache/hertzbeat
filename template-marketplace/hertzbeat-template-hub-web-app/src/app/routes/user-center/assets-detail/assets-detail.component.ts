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
import {saveAs} from 'file-saver';
import {NzMessageService} from 'ng-zorro-antd/message';

import {TemplateService} from '../../../service/template.service';
import {finalize, Observable, Subscription, window} from "rxjs";
import {LocalStorageService} from "../../../service/local-storage.service";
import {CategoryService} from "../../../service/category.service";
import {VersionService} from "../../../service/version.service";
import {NzUploadChangeParam, NzUploadFile} from "ng-zorro-antd/upload";

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
  star:number;
  create_time: string;
  update_time: string;
  off_shelf: number;
  is_del: number;
}

@Component({
  selector: 'market',
  templateUrl: './assets-detail.component.html',
  styleUrls: ['./assets-detail.component.less']
})
export class AssetsDetailComponent implements OnInit, OnDestroy {
  constructor(private templateService: TemplateService,
              private msg: NzMessageService,
              private localStorageService: LocalStorageService,
              private categoryService: CategoryService,
              private versionService: VersionService,) {}

  userId:number=0;

  templateInfo :any = null;
  categoryList: any[] = [];
  latestVersion :any = null;
  versionList: any[] = [];

  totalElements = 10;
  totalPages = 1;
  pageIndex=0;
  pageSize = 2;
  numberOfPages = 1;
  newPageIndex=this.pageIndex;
  newPageSize = this.pageSize;
  pageSizeOptions:number[]=[2,5,10,20];

  categoryStr='';

  showPage = 1;

  visible = false;

  error = 'success';
  type = 0;
  loading = false;

  count = 0;
  interval$: any;

  fileList: NzUploadFile[] = [];
  file: any[] = [];

  newTemplateInfo = {
    id: 0,
    name: '',
    description: '模版描述',
    descriptionVersion: '版本描述',
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

  open(): void {
    this.visible = true;
  }

  close(): void {
    this.visible = false;
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

  getCategoryStr(value:number):string{
    for (const item of this.categoryList) {
      if(item.value==value){
        return item.label;
      }
    }
    return ' '
  }

  updateTemplate(): void {
    if(this.file.length==0){
      this.msg.error("文件为空");
      return;
    }
    const formData = new FormData();
    if (this.file.length > 0) {
      formData.append('file', this.file[0]);
      this.newTemplateInfo.id=this.templateInfo.id;
      this.newTemplateInfo.name=this.templateInfo.name;
      this.newTemplateInfo.description=this.templateInfo.description;
      this.newTemplateInfo.userId=this.templateInfo.user;
      this.newTemplateInfo.categoryId=this.templateInfo.categoryId;
      this.newTemplateInfo.category=this.getCategoryStr(this.newTemplateInfo.categoryId)
      formData.append('templateDto', JSON.stringify(this.newTemplateInfo));
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
              this.getVersions();
              this.close();
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

  downloadTemplateNow(): void {
    this.templateService.downloadLatestTemplate(this.templateInfo.user, this.templateInfo.id, this.templateInfo.latest).subscribe(blob => {
      saveAs(blob, `${this.templateInfo.name}-${this.latestVersion.version}.yml`);
      this.localStorageService.removeData('nowTemplate');
      this.templateInfo.download++;
      this.localStorageService.putData('nowTemplate', JSON.stringify(this.templateInfo));
    });
  }

  downloadVersion(version:string, versionId:number): void {
    this.templateService.downloadTemplate(this.templateInfo.user, this.templateInfo.id,version, versionId).subscribe(blob => {
      saveAs(blob, `${this.templateInfo.name}-${version}.yml`);
      this.localStorageService.removeData('nowTemplate');
      this.templateInfo.download++;
      this.localStorageService.putData('nowTemplate', JSON.stringify(this.templateInfo));
    });
  }

  shareVersionNow(versionId:number): void {
    this.versionService.shareVersion(versionId).subscribe(message=>{
      if(message.code==0){
        this.msg.success('已复制分享链接，快去发送给对方吧！');
        const selBox = document.createElement('textarea');
        selBox.style.position = 'fixed';
        selBox.style.left = '0';
        selBox.style.top = '0';
        selBox.style.opacity = '0';
        selBox.value = message.msg;
        document.body.appendChild(selBox);
        selBox.focus();
        selBox.select();
        document.execCommand('copy');
        document.body.removeChild(selBox);
      }else{
        this.msg.error(message.msg);
      }
    })
  }

  ngOnInit(): void {
    const user=this.localStorageService.getData("userId");
    if(user==null) this.userId=0;
    else this.userId=parseInt(user);

    this.templateInfo=JSON.parse(<string>this.localStorageService.getData('nowTemplate'));
    this.versionService.getVersion(this.templateInfo.latest).subscribe(response => {
      if(response.code == 0) {
        this.latestVersion=response.data;
        console.log(this.latestVersion);
      }else {
        this.msg.error('版本信息获取失败'+response.msg)
      }
    })
    this.categoryList=JSON.parse(<string>this.localStorageService.getData('categoryList'));
    // console.log(this.templateInfo);
    // console.log(this.categoryList);
    for (const item of this.categoryList) {
      if(item.value==this.templateInfo.categoryId){
        this.categoryStr=item.label;
      }
    }
    this.getVersions();
  }

  pageIndexChange(newIndex:number){
    this.newPageIndex=newIndex-1;
    console.log("newPageIndex",this.newPageIndex,"newPageSize",this.newPageSize);
    this.getVersions()
  }

  pageSizeChange(newSize:number){
    this.newPageSize=newSize;
    console.log("newSize",newSize,"newPageIndex",this.newPageIndex);
    this.getVersions()
  }

  getVersions(){
    this.versionService.getVersionPage(this.templateInfo.id,0,this.newPageIndex,this.newPageSize).subscribe(response => {
      if(response.code == 0) {
        this.versionList=response.data.content;
        this.totalElements=response.data.totalElements;
        this.totalPages=response.data.totalPages;
        this.pageIndex=response.data.pageable.pageNumber;
        this.pageSize=response.data.pageable.pageSize;
        this.numberOfPages=response.data.numberOfElements;
      }
    })
  }

  ngOnDestroy(): void {
    this.localStorageService.removeData('nowTemplate');
  }

  protected readonly window = window;
}
