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

import { Component, Inject, Input, OnInit, ElementRef, Renderer2, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';

import { Monitor } from '../../../pojo/Monitor';
import { MonitorService } from '../../../service/monitor.service';

@Component({
  selector: 'app-help-message-show',
  templateUrl: './help-message-show.component.html',
  styleUrls: ['./help-message-show.component.less']
})
export class HelpMessageShowComponent implements OnInit {
  @Input()
  help_message_content: string = '';
  @Input()
  guild_link: string = '';
  @Input()
  module_name!: string;
  @Input()
  icon_name: string = 'home';
  constructor(private route: ActivatedRoute, private rd2: Renderer2, private el: ElementRef) {}
  isCollapsed: boolean = false;
  targetHeight: number = 140;
  collapse_expand: string = 'collapse';
  @ViewChild('collapsed_content') collapsed_content: any;
  handleButtonClick(): void {
    this.isCollapsed = !this.isCollapsed;
    localStorage.setItem('collapse_status', JSON.stringify(this.isCollapsed));
    this.targetHeight = localStorage.getItem('collapse_status') === 'true' ? 28.8 : 140;
    localStorage.setItem('collapse_height', JSON.stringify(this.targetHeight));
    this.rd2.setStyle(this.collapsed_content.nativeElement, 'max-height', `${this.targetHeight}px`);
    this.collapse_expand = this.isCollapsed ? 'expand' : 'collapse';
    localStorage.setItem('collapse_button', JSON.stringify(this.collapse_expand));
  }

  app!: string | undefined;
  tag!: string | undefined;
  pageIndex: number = 1;
  pageSize: number = 8;
  total: number = 0;
  monitors!: Monitor[];
  tableLoading: boolean = true;
  checkedMonitorIds = new Set<number>();

  ngOnInit(): void {
    this.isCollapsed = localStorage.getItem('collapse_status') === 'true';
    this.el.nativeElement.querySelector('.help_message_div').style['max-height'] = `${localStorage.getItem('collapse_height')}px`;
    this.collapse_expand = this.isCollapsed ? 'expand' : 'collapse';
    this.route.queryParamMap.subscribe(paramMap => {
      let appStr = paramMap.get('app');
      let tagStr = paramMap.get('tag');
      if (tagStr != null) {
        this.tag = tagStr;
      } else {
        this.tag = undefined;
      }
      if (appStr != null) {
        this.app = appStr;
      } else {
        this.app = undefined;
      }
      this.pageIndex = 1;
      this.pageSize = 8;
      this.checkedMonitorIds = new Set<number>();
    });
  }

  isLoaded(): boolean {
    return (this.app != undefined && this.module_name == undefined) || this.module_name != undefined;
  }
}
