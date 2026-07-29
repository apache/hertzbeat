/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

type AlertIntegrationReadiness = 'ready' | 'configuration_required' | 'guide_blocked';
export type AlertIntegrationIconKey =
  | 'hertzbeat'
  | 'prometheus'
  | 'skywalking'
  | 'uptime-kuma'
  | 'zabbix'
  | 'tencent'
  | 'alibabacloud'
  | 'huaweicloud'
  | 'volcengine';
export type AlertIntegrationCatalogItem = {
  source: string;
  displayNameKey: string;
  iconKey: AlertIntegrationIconKey;
  readiness: AlertIntegrationReadiness;
  limitations: string[];
};
export type AlertIntegrationCatalog = { items: AlertIntegrationCatalogItem[] };
export type AlertIntegrationGuide = AlertIntegrationCatalogItem & {
  method: 'POST';
  ingressPath: string;
  payloadShape: string;
  requiredHeaders: { Authorization: 'Bearer {token}' };
  requiredFields: string[];
  steps: string[];
  snippets: string[];
  acknowledgement: string;
};
export type AlertIntegrationFailureKind = 'permission' | 'unavailable' | 'contract' | 'error';
export type AlertIntegrationState =
  | { kind: 'loading' }
  | { kind: AlertIntegrationFailureKind }
  | { kind: 'not-found'; catalog: AlertIntegrationCatalogItem[] }
  | { kind: 'ready'; catalog: AlertIntegrationCatalogItem[]; guide: AlertIntegrationGuide };
export type AlertIntegrationCopyState = {
  source: string;
  target: 'endpoint' | 'authorization';
  outcome: 'copied' | 'failed';
} | null;

export class AlertIntegrationRequestFailure extends Error {
  constructor(readonly kind: Exclude<AlertIntegrationFailureKind, 'contract'>) {
    super('Alert integration request failed');
    this.name = 'AlertIntegrationRequestFailure';
  }
}

export class AlertIntegrationContractError extends Error {
  constructor() {
    super('Alert integration response is invalid');
    this.name = 'AlertIntegrationContractError';
  }
}

const iconPaths: Readonly<Record<AlertIntegrationIconKey, string>> = {
  hertzbeat: '/assets/logo.svg',
  prometheus: '/assets/img/integration/prometheus.svg',
  skywalking: '/assets/img/integration/skywalking.svg',
  'uptime-kuma': '/assets/img/integration/uptime-kuma.svg',
  zabbix: '/assets/img/integration/zabbix.svg',
  tencent: '/assets/img/integration/tencent.svg',
  alibabacloud: '/assets/img/integration/alibabacloud.svg',
  huaweicloud: '/assets/img/integration/huaweicloud.svg',
  volcengine: '/assets/img/integration/volcengine.svg'
};

export function alertIntegrationIconPath(iconKey: AlertIntegrationIconKey) {
  return iconPaths[iconKey];
}

export function buildAlertIngressContract(origin: string, guide: AlertIntegrationGuide) {
  const trustedOrigin = new URL(origin).origin;
  return {
    endpoint: new URL(guide.ingressPath, `${trustedOrigin}/`).toString(),
    authorizationHeader: `Authorization: ${guide.requiredHeaders.Authorization}`
  };
}

export function alertIntegrationFailureKind(error: unknown): AlertIntegrationFailureKind {
  if (error instanceof AlertIntegrationRequestFailure) return error.kind;
  return error instanceof AlertIntegrationContractError ? 'contract' : 'error';
}
