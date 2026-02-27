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

import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN, I18nPipe } from '@delon/theme';
import { SharedModule } from '@shared';
import { NzDividerComponent } from 'ng-zorro-antd/divider';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { MarkdownModule } from 'ngx-markdown';

import { AuthService } from '../../../service/auth.service';

interface DataSource {
  id: string;
  name: string;
  icon: string;
}

const MARKDOWN_DOC_PATH = './assets/doc/alert-integration';

@Component({
  selector: 'app-alert-integration',
  standalone: true,
  imports: [CommonModule, I18nPipe, MarkdownModule, HttpClientModule, NzDividerComponent, SharedModule],
  templateUrl: './alert-integration.component.html',
  styleUrl: './alert-integration.component.less'
})
export class AlertIntegrationComponent implements OnInit {
  dataSources: DataSource[] = [
    {
      id: 'webhook',
      name: this.i18nSvc.fanyi('alert.integration.source.webhook'),
      icon: 'assets/logo.svg'
    },
    {
      id: 'prometheus',
      name: this.i18nSvc.fanyi('alert.integration.source.prometheus'),
      icon: 'assets/img/integration/prometheus.svg'
    },
    {
      id: 'alertmanager',
      name: this.i18nSvc.fanyi('alert.integration.source.alertmanager'),
      icon: 'assets/img/integration/prometheus.svg'
    },
    {
      id: 'skywalking',
      name: this.i18nSvc.fanyi('alert.integration.source.skywalking'),
      icon: 'assets/img/integration/skywalking.svg'
    },
    {
      id: 'uptime-kuma',
      name: this.i18nSvc.fanyi('alert.integration.source.uptime-kuma'),
      icon: 'assets/img/integration/uptime-kuma.svg'
    },
    {
      id: 'zabbix',
      name: this.i18nSvc.fanyi('alert.integration.source.zabbix'),
      icon: 'assets/img/integration/zabbix.svg'
    },
    {
      id: 'tencent',
      name: this.i18nSvc.fanyi('alert.integration.source.tencent'),
      icon: 'assets/img/integration/tencent.svg'
    },
    {
      id: 'alibabacloud-sls',
      name: this.i18nSvc.fanyi('alert.integration.source.alibabacloud-sls'),
      icon: 'assets/img/integration/alibabacloud.svg'
    },
    {
      id: 'huaweicloud-ces',
      name: this.i18nSvc.fanyi('alert.integration.source.huaweicloud-ces'),
      icon: 'assets/img/integration/huaweicloud.svg'
    },
    {
      id: 'volcengine',
      name: this.i18nSvc.fanyi('alert.integration.source.volcengine'),
      icon: 'assets/img/integration/volcengine.svg'
    }
  ];

  selectedSource: DataSource | null = null;
  markdownContent: string = '';
  token: string = '';
  isModalVisible: boolean = false;
  generateLoading: boolean = false;

  constructor(
    private http: HttpClient,
    private authSvc: AuthService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService,
    private notifySvc: NzNotificationService,
    private modal: NzModalService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const sourceId = params['source'];
      if (sourceId) {
        // Find matching data source
        const source = this.dataSources.find(s => s.id === sourceId);
        if (source) {
          this.selectedSource = source;
        } else {
          // If no matching source found, use the first one as default
          this.selectedSource = this.dataSources[0];
          this.router.navigate(['/alert/integration/', this.selectedSource.id]);
        }
      } else {
        // When no route params, use the first data source
        this.selectedSource = this.dataSources[0];
        this.router.navigate(['/alert/integration/', this.selectedSource.id]);
      }

      if (this.selectedSource) {
        this.loadMarkdownContent(this.selectedSource);
      }
    });
  }

  selectSource(source: DataSource) {
    this.selectedSource = source;
    this.loadMarkdownContent(source);
    this.router.navigate(['/alert/integration', source.id]);
  }

  public generateToken() {
    this.generateLoading = true;
    this.authSvc.generateToken().subscribe(message => {
      if (message.code === 0) {
        this.token = message.data?.token;
        this.isModalVisible = true;
      } else {
        this.notifySvc.warning('Failed to generate token', message.msg);
      }
      this.generateLoading = false;
    });
  }

  handleCancel(): void {
    this.isModalVisible = false;
    this.token = '';
  }

  handleOk(): void {
    this.isModalVisible = false;
    this.token = '';
  }

  private loadMarkdownContent(source: DataSource) {
    const lang = this.i18nSvc.currentLang;
    const path = `${MARKDOWN_DOC_PATH}/${source.id}.${lang}.md`;

    this.http.get(path, { responseType: 'text' }).subscribe({
      next: content => {
        this.markdownContent = content;
      },
      error: error => {
        const enPath = `${MARKDOWN_DOC_PATH}/${source.id}.en-US.md`;
        this.http.get(enPath, { responseType: 'text' }).subscribe(content => (this.markdownContent = content));
      }
    });
  }

  copyToken() {
    const el = document.createElement('textarea');
    el.value = this.token;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    this.notifySvc.success(this.i18nSvc.fanyi('common.notify.copy-success'), this.i18nSvc.fanyi('alert.integration.token.notice'));
  }
}
