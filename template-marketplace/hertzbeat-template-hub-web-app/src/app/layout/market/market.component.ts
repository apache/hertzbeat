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

import {Component, OnInit} from '@angular/core';
import {LayoutDefaultOptions} from '@delon/theme/layout-default';
import {RouterOutlet} from "@angular/router";
import {NzImageDirective} from "ng-zorro-antd/image";
import {TemplateService} from "../../service/template.service";
import {NzMessageService} from "ng-zorro-antd/message";
import {NgIf} from "@angular/common";
import {LocalStorageService} from "../../service/local-storage.service";
import {DataService} from "../../service/data.service";

@Component({
  selector: 'app-market',
  templateUrl: 'market.component.html',
  standalone: true,
  imports: [
    RouterOutlet,
    NzImageDirective,
    NgIf
  ]
})
export class LayoutMarketComponent implements OnInit{
  options: LayoutDefaultOptions = {
    logoExpanded: `./assets/brand_white.svg`,
    logoCollapsed: `./assets/logo.svg`
  };
  constructor(private templateService: TemplateService,
              private msg: NzMessageService,
              private localStorageService: LocalStorageService,
              private dataService: DataService
              ) {}

  count=0;
  isLogin:boolean = false;

  ngOnInit(): void {
    this.dataService.isLoginMsg.subscribe(isLogin => this.isLogin = isLogin)
    const userInfo = this.localStorageService.getData('userInfo');
    if(userInfo!=null){
      this.isLogin=true
    }

    this.templateService.getTemplateCount(0,0).subscribe(message=>{
      if (message.code == 0) {
        this.count=message.data;
      }else{
        this.msg.error(message.error)
      }
    })
  }

  logout():void{
    this.localStorageService.removeData('userInfo');
    this.localStorageService.removeData('userId');
    this.localStorageService.removeData('Authorization');
    this.localStorageService.removeData('refresh-token');
  }
}
