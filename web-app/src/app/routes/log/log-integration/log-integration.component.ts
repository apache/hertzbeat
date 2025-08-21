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

const MARKDOWN_DOC_PATH = './assets/doc/log-integration';

@Component({
  selector: 'app-log-integration',
  standalone: true,
  imports: [CommonModule, I18nPipe, MarkdownModule, HttpClientModule, NzDividerComponent, SharedModule],
  templateUrl: './log-integration.component.html',
  styleUrl: './log-integration.component.less'
})
export class LogIntegrationComponent implements OnInit {
  dataSources: DataSource[] = [
    {
      id: 'otlp',
      name: this.i18nSvc.fanyi('log.integration.source.otlp'),
      icon: 'assets/img/integration/otlp.svg'
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
          this.router.navigate(['/log/integration/', this.selectedSource.id]);
        }
      } else {
        // When no route params, use the first data source
        this.selectedSource = this.dataSources[0];
        this.router.navigate(['/log/integration/', this.selectedSource.id]);
      }

      if (this.selectedSource) {
        this.loadMarkdownContent(this.selectedSource);
      }
    });
  }

  selectSource(source: DataSource) {
    this.selectedSource = source;
    this.loadMarkdownContent(source);
    this.router.navigate(['/log/integration', source.id]);
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
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(this.token)
        .then(() => {
          this.notifySvc.success(
            this.i18nSvc.fanyi('common.notify.copy-success'),
            this.i18nSvc.fanyi('log.integration.token.notice')
          );
        })
        .catch(() => {
          this.notifySvc.error(
            this.i18nSvc.fanyi('common.notify.copy-fail'),
            this.i18nSvc.fanyi('log.integration.token.notice')
          );
        });
    } else {
      this.notifySvc.error(
        this.i18nSvc.fanyi('common.notify.copy-fail'),
        this.i18nSvc.fanyi('log.integration.token.notice')
      );
    }
  }
}
