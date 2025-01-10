import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { I18nPipe } from '@delon/theme';
import { MarkdownModule } from 'ngx-markdown';
import {NzDividerComponent} from "ng-zorro-antd/divider";
import {SharedModule} from "@shared";

interface DataSource {
  id: string;
  name: string;
  icon: string;
  document: string;
}

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
      id: 'prometheus',
      name: 'Prometheus',
      icon: 'assets/img/integration/prometheus.svg',
      document: `# Prometheus

HertzBeat 完全兼容 Prometheus 的告警数据格式，您可以通过配置 Prometheus 的告警规则将告警数据发送到 HertzBeat。

## Prometheus 告警配置

在 Prometheus 的配置文件中添加以下配置：

\`\`\`yaml
alerting:
  alertmanagers:
  - static_configs:
    - targets:
      - '<hertzbeat-url>/api/alert/prometheus/webhook'
\`\`\`

## 告警规则示例

\`\`\`yaml
groups:
- name: example
  rules:
  - alert: HighRequestLatency
    expr: job:request_latency_seconds:mean5m{job="myjob"} > 0.5
    for: 10m
    labels:
      severity: page
    annotations:
      summary: High request latency
\`\`\`

更多信息请参考 [Prometheus 官方文档](https://prometheus.io/docs/alerting/latest/configuration/)。
      `
    },
    {
      id: 'tencent-cloud',
      name: '腾讯云',
      icon: 'assets/img/integration/tencent.svg',
      document: `# 腾讯云告警接入

腾讯云可以通过配置告警回调将告警数据发送到 HertzBeat。

## 配置步骤

1. 登录腾讯云控制台
2. 在告警策略中配置回调地址：\`<hertzbeat-url>/api/alert/tencent/webhook\`
3. 选择推送内容模板...

更多信息请参考腾讯云官方文档。
      `
    }
  ];

  selectedSource: DataSource | null = null;

  constructor() {
    // 在构造函数中设置默认选中的数据源
    this.selectedSource = this.dataSources[0];
  }

  ngOnInit() {
    // 不再需要在这里设置默认选中项，因为已经在构造函数中设置了
  }

  selectSource(source: DataSource) {
    this.selectedSource = source;
  }
}
