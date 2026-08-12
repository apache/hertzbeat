/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import noticeRuleEditorStyles from '@/features/alert/notice-rule/components/notice-rule-editor.module.css?raw';
import alertRuleEditorStyles from '@/features/alert/shared/alert-rule-editor.module.css?raw';
import monitorListStyles from '@/features/monitor/components/monitor-list.module.css?raw';
import monitorWorkbenchStyles from '@/features/monitor/components/monitor-metric-workbench.module.css?raw';
import messageServerStyles from '@/features/settings/message-server/pages/message-server-page.module.css?raw';
import objectStoreStyles from '@/features/settings/object-store/components/object-store.module.css?raw';
import statusManagementStyles from '@/features/status/management/components/status-management.module.css?raw';
import systemConfigStyles from '@/features/settings/system-config/components/system-config-editor.module.css?raw';
import tokenStyles from '@/features/settings/token/components/token.module.css?raw';
import notificationWorkspaceStyles from '@/shared/notification-workspace/notification-workspace-navigation.module.css?raw';
import operationalPageStyles from '@/shared/operational-page/operational-page.module.css?raw';

const horizontalBorder = /border-(?:top|bottom|block)(?:-(?:start|end))?\s*:/;

function ruleBody(css: string, selector: RegExp) {
  const body = css.match(selector)?.groups?.body;
  expect(body).toBeDefined();
  return body ?? '';
}

describe('decorative boundary style contract', () => {
  it('uses spacing instead of horizontal rules around shared page regions', () => {
    expect(ruleBody(operationalPageStyles, /\.formActions\s*\{(?<body>[^}]*)\}/)).not.toMatch(horizontalBorder);
    expect(ruleBody(operationalPageStyles, /\.sectionHeader\s*\{(?<body>[^}]*)\}/)).not.toMatch(horizontalBorder);
  });

  it('does not frame settings forms or table wrappers with decorative rules', () => {
    expect(ruleBody(objectStoreStyles, /\.form\s*\{(?<body>[^}]*)\}/)).not.toMatch(horizontalBorder);
    expect(objectStoreStyles).not.toMatch(/\.field\s*\+\s*\.field\s*\{[^}]*border-top:/s);
    expect(ruleBody(systemConfigStyles, /\.form\s*\{(?<body>[^}]*)\}/)).not.toMatch(horizontalBorder);
    expect(systemConfigStyles).not.toMatch(/\.field\s*\+\s*\.field\s*\{[^}]*border-top:/s);
    expect(ruleBody(messageServerStyles, /\.channels\s*\{(?<body>[^}]*)\}/)).not.toMatch(horizontalBorder);
    expect(ruleBody(tokenStyles, /\.table\s*\{(?<body>[^}]*)\}/)).not.toMatch(horizontalBorder);
  });

  it('keeps toolbars, summaries, and workflow navigation visually open', () => {
    expect(ruleBody(monitorListStyles, /\.bulk\s*\{(?<body>[^}]*)\}/)).not.toMatch(horizontalBorder);
    expect(ruleBody(monitorWorkbenchStyles, /\.metricToolbarPrimary[^{]*\{(?<body>[^}]*)\}/)).not.toMatch(
      horizontalBorder
    );
    expect(ruleBody(notificationWorkspaceStyles, /\.workspace\s*\{(?<body>[^}]*)\}/)).not.toMatch(horizontalBorder);
    expect(ruleBody(statusManagementStyles, /\.section\s*\{(?<body>[^}]*)\}/)).not.toMatch(horizontalBorder);
  });

  it('does not use horizontal rules as form action or disclosure decoration', () => {
    expect(ruleBody(alertRuleEditorStyles, /\.actions\s*\{(?<body>[^}]*)\}/)).not.toMatch(horizontalBorder);
    expect(ruleBody(noticeRuleEditorStyles, /\.advanced\s*\{(?<body>[^}]*)\}/)).not.toMatch(horizontalBorder);
  });
});
