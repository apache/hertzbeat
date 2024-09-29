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

@Component({
  selector: 'app-market',
  templateUrl: 'market.component.html',
  standalone: true,
  imports: [
    RouterOutlet,
    NzImageDirective
  ]
})
export class LayoutMarketComponent implements OnInit{
  options: LayoutDefaultOptions = {
    logoExpanded: `./assets/brand_white.svg`,
    logoCollapsed: `./assets/logo.svg`
  };

  constructor(private templateService: TemplateService,private msg: NzMessageService,) {}

  count=0;

  ngOnInit(): void {
    this.templateService.getTemplateCount(0,0).subscribe(message=>{
      if (message.code == 0) {
        this.count=message.data;
      }else{
        this.msg.error(message.error)
      }
    })
  }
}
