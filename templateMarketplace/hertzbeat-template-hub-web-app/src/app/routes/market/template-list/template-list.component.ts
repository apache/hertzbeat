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
import {window} from 'rxjs';

import {TemplateService} from '../../../service/template.service';
import {CategoryService} from "../../../service/category.service";

@Component({
  selector: 'market',
  templateUrl: './template-list.component.html',
  styleUrls: ['./template-list.component.less']
})
export class TemplateListComponent implements OnInit, OnDestroy {
  constructor(private templateService: TemplateService,
              private msg: NzMessageService,
              private categoryService: CategoryService,) {}

  totalElements = 0;
  totalPages = 1;
  pageIndex=0;
  pageSize = 10;
  numberOfPages = 1;

  nameOption='';
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
  interval$: any;

  templateList: any[] = [];

  ngOnInit(): void {
    this.categoryService.getAllCategoryByIsDel(0).subscribe(message => {
      // console.log('返回结果',message);
      if (message.code == 0) {
        this.categoryService.clearCategoryList();
        this.categoryService.addCategoryList(message.data)
        // this.categoryService.data$=message.data;
        // console.log(this.categoryService.data$);
        this.categoryList=[];
        this.allChecked=true;
        this.indeterminate=false;
        this.categoryService.getCategoryList().forEach(item=>{
          this.checkCategory.push(item.id);
          this.categoryList.push({label: item.description, value: item.id,checked:true});
        })
      }else{
        this.msg.error('类别请求失败：'+message.msg);
      }
    })

    this.templateService.getTemplatePage(0,0,2).subscribe(message => {
      // console.log('返回结果：', message);
      if (message.code == 0) {
        this.templateList=[];
        this.templateList.push(...message.data.content);
        this.totalElements=message.data.totalElements;
        this.totalPages=message.data.totalPages;
        this.pageIndex=message.data.number;
        this.pageSize=message.data.size;
        this.numberOfPages=message.data.numberOfElements;
        this.msg.success('查询成功');
        console.log('当前列表：', this.templateList);
      } else {
        this.msg.error(message.msg);
      }
    });
  }

  getTemplatePageByOption(){

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

  ngOnDestroy(): void {
    if (this.interval$) {
      clearInterval(this.interval$);
    }
  }

  protected readonly window = window;
}
