import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN, I18nPipe } from '@delon/theme';
import { SharedModule } from '@shared';
import { NzDividerComponent } from 'ng-zorro-antd/divider';
import { MarkdownModule } from 'ngx-markdown';

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
    }
    // {
    //   id: 'tencent',
    //   name: this.i18nSvc.fanyi('alert.integration.source.tencent'),
    //   icon: 'assets/img/integration/tencent.svg'
    // }
  ];

  selectedSource: DataSource | null = null;
  markdownContent: string = '';

  constructor(
    private http: HttpClient,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const sourceId = params['source'];
      if (sourceId) {
        // 查找匹配的数据源
        const source = this.dataSources.find(s => s.id === sourceId);
        if (source) {
          this.selectedSource = source;
        } else {
          // 如果找不到匹配的数据源，使用第一个作为默认值
          this.selectedSource = this.dataSources[0];
          this.router.navigate(['/alert/integration/', this.selectedSource.id]);
        }
      } else {
        // 没有路由参数时使用第一个数据源
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
}
