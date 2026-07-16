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
import { Component, Inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN, I18nPipe } from '@delon/theme';
import { SharedModule } from '@shared';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzRadioModule } from 'ng-zorro-antd/radio';

import { AuthService } from '../../../service/auth.service';
import { ObservabilityService, OtlpConnectionForm, SignalProbeResult } from '../../../service/observability.service';

type OtlpProtocol = 'http-json' | 'http-protobuf' | 'grpc';

@Component({
  selector: 'app-log-integration',
  standalone: true,
  imports: [CommonModule, I18nPipe, SharedModule, NzRadioModule],
  templateUrl: './log-integration.component.html',
  styleUrl: './log-integration.component.less'
})
export class LogIntegrationComponent implements OnInit {
  protocol: OtlpProtocol = 'http-json';
  endpoint = '';
  token = '';
  serviceName = 'my-service';
  environment = 'production';
  generatingToken = false;
  detecting = false;
  probeResults: SignalProbeResult[] = [];
  selectedSnippet = 'environment';

  constructor(
    private authSvc: AuthService,
    private observabilitySvc: ObservabilityService,
    private notifySvc: NzNotificationService,
    private router: Router,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  ngOnInit(): void {
    this.endpoint = window.location.origin;
  }

  get formValid(): boolean {
    return Boolean(this.endpoint.trim() && this.token.trim() && this.serviceName.trim() && this.environment.trim());
  }

  generateToken(): void {
    this.generatingToken = true;
    this.authSvc.generateToken(`otlp-${Date.now()}`, 30 * 24 * 3600).subscribe({
      next: message => {
        this.generatingToken = false;
        if (message.code === 0 && message.data?.token) {
          this.token = message.data.token;
          this.notifySvc.success(this.i18nSvc.fanyi('observability.integration.token-created'), '');
        } else {
          this.notifySvc.error(this.i18nSvc.fanyi('observability.integration.token-failed'), message.msg || '');
        }
      },
      error: () => {
        this.generatingToken = false;
        this.notifySvc.error(this.i18nSvc.fanyi('observability.integration.token-failed'), '');
      }
    });
  }

  detect(): void {
    if (!this.formValid) return;
    this.detecting = true;
    this.probeResults = [];
    this.observabilitySvc.probe(this.connectionForm()).subscribe({
      next: results => {
        this.probeResults = results;
        this.detecting = false;
      },
      error: () => {
        this.detecting = false;
      }
    });
  }

  copy(text: string): void {
    navigator.clipboard.writeText(text).then(
      () => this.notifySvc.success(this.i18nSvc.fanyi('common.notify.copy-success'), ''),
      () => this.notifySvc.warning(this.i18nSvc.fanyi('common.notify.copy-fail'), '')
    );
  }

  goToTokenManagement(): void {
    this.router.navigateByUrl('/setting/settings/token');
  }

  signalLabel(signal: SignalProbeResult['signal']): string {
    return this.i18nSvc.fanyi(`observability.signal.${signal}`);
  }

  snippet(type: string): string {
    const endpoint = this.endpoint.replace(/\/+$/, '');
    const httpEndpoint = `${endpoint}/api/otlp`;
    const grpcEndpoint = endpoint.replace(/^https?:\/\//, '').replace(/:\d+$/, ':4317');
    const headers = `Authorization=Bearer ${this.token || '<token>'}`;
    if (type === 'collector') {
      return `exporters:\n  otlphttp/hertzbeat:\n    endpoint: ${httpEndpoint}\n    headers:\n      Authorization: "Bearer ${
        this.token || '<token>'
      }"\nservice:\n  pipelines:\n    metrics:\n      exporters: [otlphttp/hertzbeat]\n    logs:\n      exporters: [otlphttp/hertzbeat]\n    traces:\n      exporters: [otlphttp/hertzbeat]`;
    }
    if (type === 'java') {
      const protocol = this.protocol === 'grpc' ? 'grpc' : this.protocol === 'http-json' ? 'http/json' : 'http/protobuf';
      const target = this.protocol === 'grpc' ? grpcEndpoint : httpEndpoint;
      return `OTEL_SERVICE_NAME=${this.serviceName}\nOTEL_RESOURCE_ATTRIBUTES=deployment.environment.name=${this.environment}\nOTEL_EXPORTER_OTLP_PROTOCOL=${protocol}\nOTEL_EXPORTER_OTLP_ENDPOINT=${target}\nOTEL_EXPORTER_OTLP_HEADERS=${headers}`;
    }
    if (type === 'curl') {
      return `curl -X POST '${endpoint}/api/otlp/v1/metrics' \\\n  -H 'Authorization: Bearer ${
        this.token || '<token>'
      }' \\\n  -H 'Content-Type: application/json' \\\n  --data-binary @metrics.json`;
    }
    const protocol = this.protocol === 'grpc' ? 'grpc' : this.protocol === 'http-json' ? 'http/json' : 'http/protobuf';
    const target = this.protocol === 'grpc' ? grpcEndpoint : httpEndpoint;
    return `OTEL_SERVICE_NAME=${this.serviceName}\nOTEL_RESOURCE_ATTRIBUTES=deployment.environment.name=${this.environment}\nOTEL_EXPORTER_OTLP_PROTOCOL=${protocol}\nOTEL_EXPORTER_OTLP_ENDPOINT=${target}\nOTEL_EXPORTER_OTLP_HEADERS=${headers}`;
  }

  private connectionForm(): OtlpConnectionForm {
    return {
      endpoint: this.endpoint.trim(),
      token: this.token.trim(),
      serviceName: this.serviceName.trim(),
      environment: this.environment.trim()
    };
  }
}
