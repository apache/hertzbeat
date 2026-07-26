/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import enUS from '@/assets/i18n/en-us.json';
import jaJP from '@/assets/i18n/ja-jp.json';
import ptBR from '@/assets/i18n/pt-br.json';
import zhCN from '@/assets/i18n/zh-cn.json';
import zhTW from '@/assets/i18n/zh-tw.json';

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
      { id: 'prometheus', backendSource: 'prometheus', ingressPath: '/api/v2/alerts' },
      ...sourceIds.slice(2).map(id => ({ id, backendSource: id, ingressPath: `/api/alerts/report/${id}` }))
    ]);
    expect(resolveAlertIntegrationSource('unknown')).toBeUndefined();
  });

  it('owns one source-specific configuration contract for every supported sender', () => {
    expect(alertIntegrationSources.map(source => source.configurationKey)).toEqual(
      sourceIds.map(id => `alertIntegrations.configuration.${id}`)
    );
    expect(new Set(alertIntegrationSources.map(source => source.configurationKey)).size).toBe(sourceIds.length);
  });

  it('keeps every supported locale actionable without bypassing the en-US fallback', () => {
    [enUS, jaJP, ptBR, zhCN, zhTW].forEach(locale => {
      const instructions = sourceIds.map(
        id => locale.alertIntegrations.configuration[id as keyof typeof locale.alertIntegrations.configuration]
      );
      expect(instructions.every(instruction => instruction.trim().length >= 40)).toBe(true);
      expect(new Set(instructions).size).toBe(sourceIds.length);
    });
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
    expect(buildAlertIngressContract('https://hertzbeat.example:9443', 'prometheus')).toEqual({
      endpoint: 'https://hertzbeat.example:9443/api/v2/alerts',
      authorizationHeader: alertIntegrationAuthorizationHeader
    });
    expect(buildAlertIngressContract('https://hertzbeat.example:9443', 'unknown')).toBeUndefined();
    expect(buildAlertIngressContract('https://hertzbeat.example:9443', 'tencent')?.endpoint).not.toMatch(
      /token|authorization|api-token/i
    );
  });
});
