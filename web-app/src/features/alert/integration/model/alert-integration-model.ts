/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

export const alertIntegrationSources = [
  source('webhook', 'default', '/api/alerts/report', '/assets/logo.svg'),
  reportSource('prometheus', '/assets/img/integration/prometheus.svg'),
  reportSource('alertmanager', '/assets/img/integration/prometheus.svg'),
  reportSource('skywalking', '/assets/img/integration/skywalking.svg'),
  reportSource('uptime-kuma', '/assets/img/integration/uptime-kuma.svg'),
  reportSource('zabbix', '/assets/img/integration/zabbix.svg'),
  reportSource('tencent', '/assets/img/integration/tencent.svg'),
  reportSource('alibabacloud-sls', '/assets/img/integration/alibabacloud.svg'),
  reportSource('huaweicloud-ces', '/assets/img/integration/huaweicloud.svg'),
  reportSource('volcengine', '/assets/img/integration/volcengine.svg')
] as const;

export type AlertIntegrationSource = (typeof alertIntegrationSources)[number];
export type AlertIntegrationSourceId = AlertIntegrationSource['id'];
export type AlertIntegrationCopyState = {
  target: 'endpoint' | 'authorization';
  outcome: 'copied' | 'failed';
} | null;
export const alertIntegrationAuthorizationHeader = 'Authorization: Bearer <api-token>';

export function resolveAlertIntegrationSource(source: string) {
  return alertIntegrationSources.find(candidate => candidate.id === source);
}

export function buildAlertIngressContract(origin: string, sourceId: string) {
  const selected = resolveAlertIntegrationSource(sourceId);
  if (!selected) return undefined;
  const trustedOrigin = new URL(origin).origin;
  return {
    endpoint: new URL(selected.ingressPath, `${trustedOrigin}/`).toString(),
    authorizationHeader: alertIntegrationAuthorizationHeader
  };
}

function reportSource<const Id extends string>(id: Id, iconPath: string) {
  return source(id, id, `/api/alerts/report/${id}`, iconPath);
}

function source<const Id extends string, const Backend extends string>(
  id: Id,
  backendSource: Backend,
  ingressPath: string,
  iconPath: string
) {
  return { id, backendSource, ingressPath, iconPath, nameKey: `alertIntegrations.sources.${id}` as const };
}
