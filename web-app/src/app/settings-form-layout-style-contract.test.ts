/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import objectStoreStyles from '@/features/settings/object-store/components/object-store.module.css?raw';
import systemConfigStyles from '@/features/settings/system-config/components/system-config-editor.module.css?raw';
import operationalPageStyles from '@/shared/operational-page/operational-page.module.css?raw';

function ruleBody(css: string, selector: RegExp) {
  const body = css.match(selector)?.groups?.body;
  expect(body).toBeDefined();
  return body ?? '';
}

describe('settings form layout contract', () => {
  it('keeps system settings controls in a compact stacked rail', () => {
    const form = ruleBody(systemConfigStyles, /\.form\s*\{(?<body>[^}]*)\}/);
    const field = ruleBody(systemConfigStyles, /\.field\s*\{(?<body>[^}]*)\}/);

    expect(form).toMatch(/max-width:\s*520px/);
    expect(form).toMatch(/margin-inline:\s*0/);
    expect(field).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(field).not.toMatch(/190px/);
  });

  it('keeps object storage as an adaptive provider workspace', () => {
    const surface = ruleBody(objectStoreStyles, /\.surface\s*\{(?<body>[^}]*)\}/);
    const workspace = ruleBody(objectStoreStyles, /\.workspace\s*\{(?<body>[^}]*)\}/);
    const field = ruleBody(objectStoreStyles, /\.field\s*\{(?<body>[^}]*)\}/);

    expect(surface).toMatch(/width:\s*min\(100%,\s*840px\)/);
    expect(workspace).toMatch(/grid-template-columns:\s*238px minmax\(0,\s*1fr\)/);
    expect(field).not.toMatch(/190px/);
  });

  it('aligns default form actions with the left edge of the control rail', () => {
    const actions = ruleBody(operationalPageStyles, /\.formActions\s*\{(?<body>[^}]*)\}/);
    expect(actions).toMatch(/justify-content:\s*flex-start/);
  });
});
