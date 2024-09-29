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
import {Observable, Subscription, window} from "rxjs";
import {LocalStorageService} from "../../../service/local-storage.service";
import {CategoryService} from "../../../service/category.service";
import {VersionService} from "../../../service/version.service";

@Component({
  selector: 'market',
  templateUrl: './template-detail.component.html',
  styleUrls: ['./template-detail.component.less']
})
export class TemplateDetailComponent implements OnInit, OnDestroy {
  constructor(private templateService: TemplateService,
              private msg: NzMessageService,
              private localStorageService: LocalStorageService,
              private categoryService: CategoryService,
              private versionService: VersionService,) {}

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

  categoryStr='';

  showPage = 1;

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
      saveAs(blob, `${this.templateInfo.name}-${this.latestVersion.version}.yml`);
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
        // console.log(message.msg);
      }else{
        this.msg.error(message.msg);
      }
    })
  }

  ngOnInit(): void {
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
    console.log(this.templateInfo);
    console.log(this.categoryList);
    for (const item of this.categoryList) {
      if(item.value==this.templateInfo.category){
        this.categoryStr=item.label;
      }
    }
    this.versionService.getVersionPage(this.templateInfo.id,0,this.pageIndex,this.pageSize).subscribe(response => {
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
