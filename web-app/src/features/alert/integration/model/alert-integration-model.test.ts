/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  alertIntegrationAuthorizationHeader,
  alertIntegrationSources,
  buildAlertIngressContract,
  resolveAlertIntegrationSource
} from './alert-integration-model';

const sourceIds = [
  'webhook',
  'prometheus',
  'alertmanager',
  'skywalking',
  'uptime-kuma',
  'zabbix',
  'tencent',
  'alibabacloud-sls',
  'huaweicloud-ces',
  'volcengine'
];

describe('external alert integration model', () => {
  it('owns exactly the supported UI sources and backend mappings', () => {
    expect(alertIntegrationSources.map(source => source.id)).toEqual(sourceIds);
    expect(
      alertIntegrationSources.map(({ id, backendSource, ingressPath }) => ({ id, backendSource, ingressPath }))
    ).toEqual([
      { id: 'webhook', backendSource: 'default', ingressPath: '/api/alerts/report' },
      ...sourceIds.slice(1).map(id => ({ id, backendSource: id, ingressPath: `/api/alerts/report/${id}` }))
    ]);
    expect(resolveAlertIntegrationSource('unknown')).toBeUndefined();
  });

  it('derives ingress endpoints from the current origin and keeps secrets out of URLs', () => {
    expect(buildAlertIngressContract('https://hertzbeat.example:9443', 'webhook')).toEqual({
      endpoint: 'https://hertzbeat.example:9443/api/alerts/report',
      authorizationHeader: 'Authorization: Bearer <api-token>'
    });
    expect(buildAlertIngressContract('https://hertzbeat.example:9443', 'alertmanager')).toEqual({
      endpoint: 'https://hertzbeat.example:9443/api/alerts/report/alertmanager',
      authorizationHeader: alertIntegrationAuthorizationHeader
    });
    expect(buildAlertIngressContract('https://hertzbeat.example:9443', 'unknown')).toBeUndefined();
    expect(buildAlertIngressContract('https://hertzbeat.example:9443', 'tencent')?.endpoint).not.toMatch(
      /token|authorization|api-token/i
    );
  });
});
