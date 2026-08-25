/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { alertResourceHandoffs } from './alert-resource-handoff';
import type { AlertRecord } from './alert-model';

function alertWithLabels(labels: Record<string, string>): AlertRecord {
  return {
    id: 1,
    labels,
    annotations: null,
    content: null,
    status: 'firing',
    triggerTimes: 1,
    startAt: null,
    activeAt: null,
    endAt: null
  };
}

describe('alert resource handoffs', () => {
  it('builds exact Monitor and Entity targets with sanitized alert context', () => {
    expect(
      alertResourceHandoffs(
        alertWithLabels({ 'hertzbeat.monitor.id': '42', 'hertzbeat.entity.id': '7' }),
        '/alerts?status=firing&password=secret#private'
      )
    ).toEqual([
      { resource: 'monitor', path: '/monitors/42?returnTo=%2Falerts%3Fstatus%3Dfiring' },
      { resource: 'entity', path: '/entities/7?returnTo=%2Falerts%3Fstatus%3Dfiring' }
    ]);
  });

  it.each(['', '0', '-1', '01', '1.0', '9007199254740992', '42\n'])('rejects non-canonical authority id %j', id => {
    expect(alertResourceHandoffs(alertWithLabels({ 'hertzbeat.monitor.id': id }), '/alerts')).toEqual([]);
  });

  it('does not infer resource identity from aliases or ordinary alert labels', () => {
    expect(
      alertResourceHandoffs(
        alertWithLabels({ monitor_id: '42', entityId: '7', instance: '42', instancename: 'monitor-42' }),
        '/alerts'
      )
    ).toEqual([]);
  });

  it.each(['/monitors', 'https://example.com/alerts?status=firing', '//example.com/alerts'])(
    'falls back to Alert Center for an untrusted return target %s',
    returnTo => {
      expect(alertResourceHandoffs(alertWithLabels({ 'hertzbeat.monitor.id': '42' }), returnTo)).toEqual([
        { resource: 'monitor', path: '/monitors/42?returnTo=%2Falerts' }
      ]);
    }
  );
});
