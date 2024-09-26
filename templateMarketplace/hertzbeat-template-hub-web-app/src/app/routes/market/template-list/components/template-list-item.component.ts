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

import {TemplateService} from '../../../../service/template.service';

@Component({
  selector: 'template-list-item',
  templateUrl: './template-list-item.component.html',
  styleUrls: ['./template-list-item.component.less']
})
export class TemplateListItemComponent implements OnInit, OnDestroy {
  constructor(private templateService: TemplateService, private msg: NzMessageService) {}

  totalElements = 0;
  totalPages = 1;
  pageIndex=0;
  pageSize = 10;
  numberOfPages = 1;

  type = 0;

  loading = false;

  interval$: any;

  templateList: any[] = [];

  ngOnDestroy(): void {
    if (this.interval$) {
      clearInterval(this.interval$);
    }
  }

  ngOnInit(): void {
    this.templateService.getTemplatePage(0,0,2).subscribe(message => {
      if (message.code == 0) {
        this.templateList.push(...message.data.content);
        this.totalElements=message.data.totalElements;
        this.totalPages=message.data.totalPages;
        this.pageIndex=message.data.number;
        this.pageSize=message.data.size;
        this.numberOfPages=message.data.numberOfElements;
        this.msg.success('查询成功');
      } else {
        this.msg.error(message.msg);
      }
    });
  }

  getTemplatePageByOption(){

  }

  protected readonly window = window;
}
