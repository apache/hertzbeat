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
import {window} from "rxjs";
import {LocalStorageService} from "../../../service/local-storage.service";
import {StarService} from "../../../service/star.service";
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
              private starService: StarService,
              private versionService: VersionService,) {}

  userId:number = 0;

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

  isStarNow:boolean = false;

  showPage = 1;

  downloadTemplateNow(): void {
    this.templateService.downloadLatestTemplate(this.templateInfo.user, this.templateInfo.id, this.templateInfo.latest).subscribe(blob => {
      saveAs(blob, `${this.templateInfo.name}-${this.latestVersion.version}.yml`);
      this.localStorageService.removeData('nowTemplate');
      this.templateInfo.download++;
      for (let item of this.versionList) {
        if(item.id==this.templateInfo.latest) {
          item.download++;
          break;
        }
      }
      this.localStorageService.putData('nowTemplate', JSON.stringify(this.templateInfo));
    });
  }

  downloadVersion(version:string, versionId:number): void {
    this.templateService.downloadTemplate(this.templateInfo.user, this.templateInfo.id,version, versionId).subscribe(blob => {
      saveAs(blob, `${this.templateInfo.name}-${version}.yml`);
      for (let item of this.versionList) {
        if(item.id==versionId) {
          item.download++;
          break;
        }
      }
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
    if(this.userId!=0){
      this.starService.assertTemplateStarByUser(this.userId,this.templateInfo.id).subscribe(response => {
        if(response.code == 0) {
          this.isStarNow=response.data
        }else{
          this.msg.error('是否收藏判断失败'+response.msg)
        }
      })
    }
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

  starTemplate(id:number){
    const formData = new FormData();
    formData.append('user', this.userId.toString());
    formData.append('template', id.toString());
    this.starService.starTemplate(formData)
      .subscribe(message=>{
        if (message.code == 0) {
          this.msg.success(message.msg);
          this.isStarNow=true;
          this.templateInfo.star++;
        }else{
          this.msg.error(message.msg);
        }
      })
  }

  cancelStarTemplate(id:number){
    const formData = new FormData();
    formData.append('templateId', id.toString());
    this.starService.cancelStarTemplate(this.userId,formData)
      .subscribe(message=>{
        if (message.code == 0) {
          this.msg.success(message.msg);
          this.isStarNow=false;
          this.templateInfo.star--;
        }else{
          this.msg.error(message.msg);
        }
      })
  }

  ngOnDestroy(): void {
    this.localStorageService.removeData('nowTemplate');
  }

  protected readonly window = window;
}
