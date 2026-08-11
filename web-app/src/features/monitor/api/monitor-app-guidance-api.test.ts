/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ apiMessageGet: vi.fn() }));
vi.mock('@/core/http/api-message', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/http/api-message')>()),
  ...http
}));

import { MonitorContractError } from '../model/monitor-contract';
import { loadMonitorAppGuidance } from './monitor-app-guidance-api';

describe('monitor application guidance API', () => {
  beforeEach(() => http.apiMessageGet.mockReset());

  it('loads the localized application help and safe help link', async () => {
    const signal = new AbortController().signal;
    http.apiMessageGet.mockResolvedValue({
      'monitor.app.mysql.help': '<p>MySQL monitoring help</p>',
      'monitor.app.mysql.helpLink': 'https://hertzbeat.apache.org/docs/help/mysql',
      'monitor.app.postgresql.helpLink': 'https://hertzbeat.apache.org/docs/help/postgresql'
    });

    await expect(loadMonitorAppGuidance('mysql', 'zh-CN', signal)).resolves.toEqual({
      help: '<p>MySQL monitoring help</p>',
      helpUrl: 'https://hertzbeat.apache.org/docs/help/mysql'
    });
    expect(http.apiMessageGet).toHaveBeenCalledWith('/api/i18n/zh-CN', { signal });
  });

  it('drops an unsafe link without suppressing the localized help', async () => {
    http.apiMessageGet.mockResolvedValue({
      'monitor.app.mysql.help': 'MySQL monitoring help',
      'monitor.app.mysql.helpLink': 'javascript:alert(1)'
    });

    await expect(loadMonitorAppGuidance('mysql', 'en-US')).resolves.toEqual({
      help: 'MySQL monitoring help',
      helpUrl: null
    });
  });

  it.each(['', 'mysql database', '../mysql'])('rejects invalid application identity %j before I/O', async app => {
    await expect(loadMonitorAppGuidance(app, 'en-US')).rejects.toBeInstanceOf(MonitorContractError);
    expect(http.apiMessageGet).not.toHaveBeenCalled();
  });
});
