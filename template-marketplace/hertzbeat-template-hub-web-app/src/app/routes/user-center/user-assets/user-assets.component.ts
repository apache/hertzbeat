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
import {saveAs} from "file-saver";

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
  templateUrl: './user-assets.component.html',
  styleUrls: ['./user-assets.component.less'],
})
export class UserAssetsComponent implements OnInit,OnDestroy {
  constructor(fb: FormBuilder,
              private templateService: TemplateService,
              private msg: NzMessageService,
              private categoryService: CategoryService,
              private localStorageService: LocalStorageService,) {}

  userId:number=0;

  templateList: any[] = [];

  totalElements = 1;
  totalPages = 1;
  pageIndex=0;
  pageSize = 9;
  numberOfPages = 1;
  newPageIndex=this.pageIndex;
  newPageSize = this.pageSize;
  pageSizeOptions:number[]=[9,18,27];

  nameLike='';
  type = 0;

  allChecked = false;
  indeterminate = true;
  checkCategory:number[] = [1];
  categoryList = [
    { label: '数据库监控模版', value: 1, checked: true },
    { label: '应用服务监控模版', value: 2, checked: false },
  ];

  orderOption = 1;

  loading = false;

  ngOnInit(): void {
    const user=this.localStorageService.getData("userId");
    if(user==null) this.userId=0;
    else this.userId=parseInt(user);

    // this.templateList=[];
    this.categoryService.clearCategoryList();
    this.categoryService.getAllCategoryByIsDel(0).subscribe(message => {
      console.log('返回结果',message);
      if (message.code == 0) {
        this.categoryService.addCategoryList(message.data)
        this.categoryList=[];
        this.allChecked=true;
        this.indeterminate=false;
        this.categoryService.getCategoryList().forEach(item=>{
          this.checkCategory.push(item.id);
          this.categoryList.push({label: item.description, value: item.id, checked:true});
        })
        this.localStorageService.putData('categoryList',JSON.stringify(this.categoryList));
      }else{
        this.msg.error('类别请求失败：'+message.msg);
      }
    })

    this.templateService.getTemplatePageByUser(this.userId,0,this.pageSize).subscribe(message => {
      if (message.code == 0) {
        this.templateList.push(...message.data.content);
        this.totalElements=message.data.totalElements;
        this.totalPages=message.data.totalPages;
        this.pageIndex=message.data.pageable.pageNumber;
        this.pageSize=message.data.pageable.pageSize;
        this.numberOfPages=message.data.numberOfElements;
        this.msg.success('查询成功');
        this.templateService.setTemplateSubject(this.templateList);
      } else {
        this.msg.error(message.msg);
      }
    });
  }

  orderOptionChange(orderValue:number) {
    //
    console.log(orderValue);
  }

  pageIndexChange(newIndex:number){
    this.newPageIndex=newIndex-1;
    this.getTemplatePageByOption()
  }

  pageSizeChange(newSize:number){
    this.newPageSize=newSize;
    this.getTemplatePageByOption()
  }

  getTemplatePageByOption(){
    this.templateService.getTemplatePageByOption(this.userId,this.allChecked,this.checkCategory,this.nameLike,this.orderOption,0,this.newPageIndex,this.newPageSize)
      .subscribe(message => {
        if (message.code == 0) {
          this.templateList=[];
          this.templateList.push(...message.data.content);
          this.totalElements=message.data.totalElements;
          this.totalPages=message.data.totalPages;
          this.pageIndex=message.data.pageable.pageNumber;
          this.pageSize=message.data.pageable.pageSize;
          this.numberOfPages=message.data.numberOfElements;
          this.msg.success('查询成功');
          this.templateService.setTemplateSubject(this.templateList);
        } else {
          this.msg.error(message.msg);
        }
      })
  }

  updateAllChecked(): void {
    this.checkCategory=[];
    this.indeterminate = false;
    if (this.allChecked) {
      this.categoryList = this.categoryList.map(item => ({
        ...item,
        checked: true
      }));
    } else {
      this.categoryList = this.categoryList.map(item => ({
        ...item,
        checked: false
      }));
    }
    this.categoryList.forEach(item => {
      if (item.checked) {
        this.checkCategory.push(item.value);
      }
    })
  }

  updateSingleChecked(): void {
    this.checkCategory=[];
    if (this.categoryList.every(item => !item.checked)) {
      this.allChecked = false;
      this.indeterminate = false;
    } else if (this.categoryList.every(item => item.checked)) {
      this.allChecked = true;
      this.indeterminate = false;
    } else {
      this.allChecked = false;
      this.indeterminate = true;
    }
    this.categoryList.forEach(item => {
      if (item.checked) {
        this.checkCategory.push(item.value);
      }
    })
  }

  downloadLatestTemplate(id:number,user:number,latest:number,name:string){
    this.templateService.downloadLatestTemplate(user,id,latest)
      .subscribe((blob:Blob)=>{
          saveAs(blob, `${name}-latest.yml`);
        },
        error => {
          console.error('下载文件时发生错误:', error);
        });
  }

  pickTemplate(id:number){
    this.templateService.setNowTemplate(id);
    let nowTemplate = this.templateService.getNowTemplate();
    localStorage.setItem('nowTemplate', JSON.stringify(nowTemplate));
    // console.log(this.templateService.getNowTemplate());
  }

  ngOnDestroy(): void {
    this.templateList=[];
    this.categoryList=[];
    this.templateService.clearTemplateSubject();
    this.categoryService.clearCategoryList();
  }

  protected readonly window = window;
}
