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
import {NzMessageService} from 'ng-zorro-antd/message';

import {TemplateService, TemplateVO} from '../../../service/template.service';
import {CategoryService} from "../../../service/category.service";
import {StarService} from "../../../service/star.service";
import {LocalStorageService} from "../../../service/local-storage.service";
import {saveAs} from "file-saver";

declare global {
  interface Window { URL: any; }
}

window.URL = window.URL || {};

@Component({
  selector: 'market',
  templateUrl: './template-list.component.html',
  styleUrls: ['./template-list.component.less']
})
export class TemplateListComponent implements OnInit, OnDestroy {
  constructor(private templateService: TemplateService,
              private msg: NzMessageService,
              private categoryService: CategoryService,
              private starService: StarService,
              private localStorageService: LocalStorageService,) {}

  templateList: TemplateVO[] = [];
  userId:number=0;

  totalElements = 1;
  totalPages = 1;
  pageIndex=0;
  pageSize = 9;
  numberOfPages = 1;
  newPageIndex= this.pageIndex;
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
    this.templateList=[];
    this.categoryService.clearCategoryList();
    this.categoryService.getAllCategoryByIsDel(0).subscribe(message => {
      // console.log('返回结果',message);
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

    const user=this.localStorageService.getData("userId");
    if(user==null) this.userId=0;
    else this.userId=parseInt(user);

    this.templateService.getTemplatePage(0, this.userId,0,9).subscribe(message => {
      if (message.code == 0) {
        this.templateList.push(...message.data.content);
        console.log(this.templateList);
        this.totalElements=message.data.totalElements;
        this.totalPages=message.data.totalPages;
        this.pageIndex=message.data.pageable.pageNumber;
        this.pageSize=message.data.pageable.pageSize;
        this.numberOfPages=message.data.numberOfElements;
        // this.msg.success('查询成功');
        this.templateService.setTemplateSubject(this.templateList);
      } else {
        this.msg.error(message.msg);
      }
    });
  }

  orderOptionChange(orderValue:number) {
    this.msg.warning('排序功能开发中！');
    console.log(orderValue);
  }

  tagChange(){
    this.msg.warning('标签功能开发中！');
  }

  pageIndexChange(newIndex:number){
    this.newPageIndex=newIndex-1;
    // console.log("newPageIndex",this.newPageIndex,"newPageSize",this.newPageSize);
    this.getTemplatePageByOption()
  }

  pageSizeChange(newSize:number){
    this.newPageSize=newSize;
    // console.log("newSize",newSize,"newPageIndex",this.newPageIndex);
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
          // this.msg.success('查询成功');
          this.templateService.setTemplateSubject(this.templateList);
          console.log(this.templateList)
          console.log(message)
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
    if(this.checkCategory.length!=0) this.getTemplatePageByOption();
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
    this.getTemplatePageByOption();
  }

  downloadLatestTemplate(id:number,user:number,latest:number,name:string){
    this.templateService.downloadLatestTemplate(user,id,latest)
      .subscribe((blob:Blob)=>{
          saveAs(blob, `${name}-latest.yml`);
          for (let templateVO of this.templateList) {
            if(templateVO.id==id) {
              templateVO.download++;
              break;
            }
          }
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

  starTemplate(id:number){
    const formData = new FormData();
    formData.append('user', this.userId.toString());
    formData.append('template', id.toString());
    this.starService.starTemplate(formData)
      .subscribe(message=>{
        if (message.code == 0) {
          for (let templateVO of this.templateList) {
            if(templateVO.id==id) {
              templateVO.starByNowUser=true;
              templateVO.star++;
              break;
            }
          }
          this.msg.success(message.msg);
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
          for (let templateVO of this.templateList) {
            if(templateVO.id==id) {
              templateVO.starByNowUser=false;
              templateVO.star--;
              break;
            }
          }
        }else{
          this.msg.error(message.msg);
        }
      })
  }

  ngOnDestroy(): void {
    this.templateList=[];
    this.categoryList=[];
    this.templateService.clearTemplateSubject();
    this.categoryService.clearCategoryList();
  }
  protected readonly event = event;
}
