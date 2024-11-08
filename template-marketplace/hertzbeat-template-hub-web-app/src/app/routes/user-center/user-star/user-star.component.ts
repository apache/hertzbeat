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

import {TemplateService, TemplateVO} from '../../../service/template.service';

import {CategoryService} from "../../../service/category.service";
import {StarService} from "../../../service/star.service";
import {LocalStorageService} from "../../../service/local-storage.service";
import {saveAs} from "file-saver";

// interface TemplateInfo {
//   id: number;
//   name: string;
//   description: string;
//   descriptionVersion: string;
//   latest: number;
//   versions: string[];
//   currentVersion: string;
//   user: string;
//   userId: number;
//   category: string;
//   categoryId: number;
//   download: number;
//   star:number,
//   create_time: string;
//   update_time: string;
//   off_shelf: number;
//   is_del: number;
// }

@Component({
  selector: 'user-upload',
  templateUrl: './user-star.component.html',
  styleUrls: ['./user-star.component.less'],
})
export class UserStarComponent implements OnInit,OnDestroy {
  constructor(fb: FormBuilder,
              private templateService: TemplateService,
              private msg: NzMessageService,
              private categoryService: CategoryService,
              private starService: StarService,
              private localStorageService: LocalStorageService,) {}

  userId:number=0;

  templateList: TemplateVO[] = [];

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
    this.templateList=[]
    const user=this.localStorageService.getData("userId");
    if(user==null) this.userId=0;
    else this.userId=parseInt(user);

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

    this.starService.getTemplatePageByUserStar(this.userId,0,9).subscribe(message => {
      if (message.code == 0) {
        this.templateList=message.data.content;
        // this.templateList.push(...message.data.content);
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
    this.starService.cancelStarTemplate(1,formData)
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
}
