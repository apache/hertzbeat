/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import type { AlertGroup } from './alert-model';
import { buildShellAlertItems, shellAlertSoundCanToggle } from './shell-alert-notification-model';

describe('shell alert notification model', () => {
  it('projects bounded recent alert evidence without inventing names', () => {
    expect(
      buildShellAlertItems([
        group(1, { alertname: 'Checkout latency', severity: 'critical' }, 'ignored child content'),
        group(2, null, 'Database unavailable'),
        group(3, null, null)
      ])
    ).toEqual([
      {
        id: 1,
        title: 'Checkout latency',
        detail: 'ignored child content',
        severity: 'critical',
        updatedAt: '2026-07-25 10:20:00'
      },
      {
        id: 2,
        title: 'Database unavailable',
        detail: null,
        severity: null,
        updatedAt: '2026-07-25 10:20:00'
      },
      {
        id: 3,
        title: '#3',
        detail: null,
        severity: null,
        updatedAt: '2026-07-25 10:20:00'
      }
    ]);
  });

  it('caps the header preview independently from the server page size', () => {
    expect(buildShellAlertItems(Array.from({ length: 8 }, (_, index) => group(index + 1)))).toHaveLength(5);
  });

  it('keeps global mute writes ADMIN-only while every shell role retains read evidence', () => {
    expect(shellAlertSoundCanToggle(['ADMIN'])).toBe(true);
    expect(shellAlertSoundCanToggle(['USER'])).toBe(false);
    expect(shellAlertSoundCanToggle(['GUEST'])).toBe(false);
    expect(shellAlertSoundCanToggle([])).toBe(false);
  });
});

function group(
  id: number,
  commonLabels: Record<string, string> | null = null,
  content: string | null = null
): AlertGroup {
  return {
    id,
    status: 'firing',
    groupLabels: null,
    commonLabels,
    commonAnnotations: null,
    alertFingerprints: null,
    alerts: content
      ? [
          {
            id: id * 10,
            labels: null,
            annotations: null,
            content,
            status: 'firing',
            triggerTimes: 1,
            startAt: null,
            activeAt: null,
            endAt: null
          }
        ]
      : [],
    gmtUpdate: '2026-07-25 10:20:00' as AlertGroup['gmtUpdate']
  };
}
