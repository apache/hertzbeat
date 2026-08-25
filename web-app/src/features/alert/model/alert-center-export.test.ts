/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import { buildAlertCenterCsvArtifact, serializeAlertGroupsCsv } from './alert-center-export';
import type { AlertGroup, ServerLocalDateTime } from './alert-model';

const group: AlertGroup = {
  id: 7,
  status: 'firing',
  groupLabels: { alertname: '=SUM(1,1)', team: 'payments' },
  commonLabels: { severity: 'critical', 'service.name': 'checkout-api' },
  commonAnnotations: { summary: 'Latency, "high"' },
  alertFingerprints: ['fingerprint-7'],
  alerts: [
    {
      id: 70,
      labels: { instance: 'checkout-1' },
      annotations: { runbook: 'https://example.test/runbook' },
      content: 'Checkout\nlatency exceeded the threshold.',
      status: 'firing',
      triggerTimes: 3,
      startAt: 10,
      activeAt: 20,
      endAt: null
    }
  ],
  gmtUpdate: '2026-08-18 12:30:00' as ServerLocalDateTime
};

describe('Alert Center CSV export', () => {
  it('serializes one analysis row per child alert with complete group context', () => {
    const csv = serializeAlertGroupsCsv([group]);

    expect(csv.split('\r\n')).toHaveLength(2);
    expect(csv).toContain('"group_id","group_name","group_status","severity"');
    expect(csv).toContain('"7","\'=SUM(1,1)","firing","critical"');
    expect(csv).toContain('"Latency, ""high"""');
    expect(csv).toContain('"Checkout\nlatency exceeded the threshold."');
    expect(csv).toContain('"{""instance"":""checkout-1""}"');
  });

  it('retains a group row when no child evidence is available and creates a dated CSV artifact', () => {
    const withoutAlerts = { ...group, alerts: [] };
    const csv = serializeAlertGroupsCsv([withoutAlerts]);
    const artifact = buildAlertCenterCsvArtifact([withoutAlerts], new Date('2026-08-18T00:00:00.000Z'));

    expect(csv.split('\r\n')).toHaveLength(2);
    expect(csv).toContain('"0","","","","",""');
    expect(artifact.filename).toBe('hertzbeat-alerts-2026-08-18.csv');
    expect(artifact.data.type).toBe('text/csv;charset=utf-8');
  });
});
