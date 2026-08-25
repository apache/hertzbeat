/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import managementStyles from './status-management.module.css?raw';
import orgSettingsStyles from './status-org-settings.module.css?raw';

const visualStyles = `${managementStyles}\n${orgSettingsStyles}`;

function ruleBody(selector: RegExp) {
  const body = visualStyles.match(selector)?.groups?.body;
  expect(body).toBeDefined();
  return body ?? '';
}

describe('status management workspace visual contract', () => {
  it('keeps authoring surfaces flat without a route-local public-page preview', () => {
    const configurationSurface = ruleBody(/\.configurationPanel\s*\{(?<body>[^}]*)\}/);
    const settingsSurface = ruleBody(/\.settingsPanel\s*\{(?<body>[^}]*)\}/);

    for (const authoringSurface of [configurationSurface, settingsSurface]) {
      expect(authoringSurface).toMatch(/border:\s*0/);
      expect(authoringSurface).toMatch(/border-radius:\s*0/);
      expect(authoringSurface).toMatch(/background:\s*transparent/);
      expect(authoringSurface).toMatch(/box-shadow:\s*none/);
    }

    expect(visualStyles).not.toMatch(/status-preview-modal/);
    expect(visualStyles).not.toMatch(/\.previewModalViewport\s*\{/);
    expect(visualStyles).not.toMatch(/\.previewFrame\s*\{/);
  });

  it('uses one centered publishing flow instead of two competing columns', () => {
    const workspace = ruleBody(/\.configurationWorkspace\s*\{(?<body>[^}]*)\}/);

    expect(workspace).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(workspace).toMatch(/max-width:\s*880px/);
    expect(workspace).toMatch(/margin-inline:\s*auto/);
    expect(workspace).not.toMatch(/minmax\(320px/);
  });

  it('keeps the active settings header inside the single content surface', () => {
    const header = ruleBody(/\.settingsContentHeader\s*\{(?<body>[^}]*)\}/);

    expect(header).toMatch(/background:\s*transparent/);
    expect(header).toMatch(/border-bottom:\s*1px solid var\(--ant-color-border-secondary\)/);
    expect(header).toMatch(/min-height:\s*52px/);
  });

  it('keeps one flat settings section without a nested card or section navigation', () => {
    const content = ruleBody(/\.settingsContent\s*\{(?<body>[^}]*)\}/);
    const row = ruleBody(/\.settingsRow\s*\{(?<body>[^}]*)\}/);
    const formItem = ruleBody(/\.settingsBody :global\(\.ant-form-item\)\s*\{(?<body>[^}]*)\}/);

    expect(visualStyles).not.toMatch(/\.settingsNavigation\s*\{/);
    expect(visualStyles).not.toMatch(/\.settingsNavigationButton\s*\{/);
    expect(content).toMatch(/border:\s*0/);
    expect(content).toMatch(/border-radius:\s*0/);
    expect(content).toMatch(/background:\s*transparent/);
    expect(content).toMatch(/box-shadow:\s*none/);
    expect(row).toMatch(/min-height:\s*52px/);
    expect(row).toMatch(/border-bottom:\s*1px solid var\(--ant-color-border-secondary\)/);
    expect(formItem).toMatch(/padding:\s*0/);
    expect(formItem).toMatch(/border:\s*0/);
  });

  it('keeps component rows readable in the publishing flow', () => {
    const list = ruleBody(/\.componentList\s*\{(?<body>[^}]*)\}/);
    const row = ruleBody(/\.componentRow\s*\{(?<body>[^}]*)\}/);
    const meta = ruleBody(/\.componentMeta\s*\{(?<body>[^}]*)\}/);
    const actions = ruleBody(/\.componentActions\s*\{(?<body>[^}]*)\}/);

    expect(list).toMatch(/border-inline:\s*0/);
    expect(list).toMatch(/border-radius:\s*0/);
    expect(list).toMatch(/background:\s*transparent/);
    expect(row).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\) auto/);
    expect(meta).toMatch(/grid-column:\s*1/);
    expect(actions).toMatch(/grid-row:\s*1 \/ span 2/);
    expect(actions).toMatch(/grid-column:\s*2/);
  });

  it('keeps the empty incident state as a flat notice instead of a card', () => {
    const empty = ruleBody(/\.incidentEmpty\s*\{(?<body>[^}]*)\}/);

    expect(empty).toMatch(/border-inline:\s*0/);
    expect(empty).toMatch(/border-radius:\s*0/);
    expect(empty).toMatch(/background:\s*transparent/);
    expect(empty).toMatch(/box-shadow:\s*none/);
  });

  it('keeps the publishing stages quiet without a decorative chevron', () => {
    const chevron = ruleBody(
      /:global\(\.status-incident-steps\.ant-steps-navigation \.ant-steps-item:not\(:last-child\)::after\)\s*\{(?<body>[^}]*)\}/
    );

    expect(chevron).toMatch(/display:\s*none/);
  });

  it('presents affected components as complete selectable rows', () => {
    const group = ruleBody(/:global\(\.status-incident-components\)\s*\{(?<body>[^}]*)\}/);
    const option = ruleBody(/:global\(\.status-incident-components \.ant-checkbox-wrapper\)\s*\{(?<body>[^}]*)\}/);
    const selected = ruleBody(
      /:global\(\.status-incident-components \.ant-checkbox-wrapper-checked\)\s*\{(?<body>[^}]*)\}/
    );

    expect(group).toMatch(/gap:\s*8px/);
    expect(group).toMatch(/border:\s*0/);
    expect(option).toMatch(/display:\s*grid/);
    expect(option).toMatch(/grid-template-columns:\s*20px minmax\(0,\s*1fr\)/);
    expect(option).toMatch(/min-height:\s*54px/);
    expect(option).toMatch(/border-radius:\s*10px/);
    expect(visualStyles).toMatch(
      /:global\(\.status-incident-components \.ant-checkbox-wrapper::after\)\s*\{\s*display:\s*none/
    );
    expect(selected).toMatch(/border-color:\s*var\(--ant-color-primary-border\)/);
    expect(selected).toMatch(/background:\s*var\(--ant-color-primary-bg\)/);
  });

  it('wraps long public links at meaningful URL boundaries', () => {
    const publicValue = ruleBody(/\.logoValue span,\s*\.linkValue span\s*\{(?<body>[^}]*)\}/);

    expect(publicValue).toMatch(/overflow-wrap:\s*break-word/);
    expect(publicValue).not.toMatch(/overflow-wrap:\s*anywhere/);
  });
});
