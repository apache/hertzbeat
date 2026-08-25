/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import alignmentStylesheet from '@/shared/horizontal-field/horizontal-field-alignment.module.css?raw';

import stylesheet from './alert-silence-editor.module.css?raw';

describe('alert silence editor source geometry', () => {
  it('keeps the 7/12/5 grid free of an extra gutter that narrows the source control column', () => {
    expect(stylesheet).toMatch(
      /\.fieldRow\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*7fr\)\s+minmax\(0,\s*12fr\)\s+minmax\(0,\s*5fr\);[^}]*column-gap:\s*0;/s
    );
    expect(stylesheet).toMatch(/\.fieldLabel\s*\{[^}]*padding-inline-end:\s*12px;/s);
  });

  it('uses the shared control-height rail without a route-local optical nudge', () => {
    expect(stylesheet).toMatch(/\.fieldLabel\s*\{[^}]*padding-inline-end:\s*12px;/s);
    expect(stylesheet).not.toMatch(/\.fieldLabel\s*\{[^}]*transform:/s);
    expect(alignmentStylesheet).toMatch(
      /\.label\s*\{[^}]*min-height:\s*var\(--ant-control-height\);[^}]*align-items:\s*center;/s
    );
    expect(alignmentStylesheet).toMatch(/\.control\s*>\s*:global\(\.ant-switch\)\s*\{[^}]*align-self:\s*center;/s);
  });

  it('resets the desktop label gutter in the mobile single-column layout', () => {
    expect(stylesheet).toMatch(
      /@media\s*\(max-width:\s*800px\)[\s\S]*?\.fieldLabel\s*\{[^}]*padding-inline-end:\s*0;[^}]*text-align:\s*left;/s
    );
    expect(alignmentStylesheet).toMatch(/@media\s*\(max-width:\s*800px\)[\s\S]*?\.label\s*\{[^}]*min-height:\s*0;/s);
  });

  it('keeps the source modal body breathing room and compact recurring controls', () => {
    expect(stylesheet).toMatch(/\.form\s*\{[^}]*padding-block:\s*24px;/s);
    expect(stylesheet).toMatch(
      /\.weekdays\s+:global\(\.ant-checkbox-group\)\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*max-content\);[^}]*gap:\s*0\s+16px;/s
    );
    expect(stylesheet).toMatch(
      /\.recurringTime\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s+minmax\(0,\s*1fr\);[\s\S]*?\.recurringTime\s+:global\(\.ant-picker\)\s*\{[^}]*width:\s*100%;/s
    );
    expect(stylesheet).not.toMatch(/\.recurringEnd\s*\{/s);
  });

  it('lets the one-time datetime range use the trailing grid track without widening ordinary controls', () => {
    expect(stylesheet).toMatch(
      /\.wideControl\s+\.fieldControl\s*\{[^}]*grid-column:\s*2\s*\/\s*-1;[^}]*padding-inline-end:\s*12px;/s
    );
  });

  it('keeps the wide datetime control visible after the mobile spacer is removed', () => {
    expect(stylesheet).toMatch(/\.fieldRow\s*>\s*\[aria-hidden=['"]true['"]\]:last-child\s*\{[^}]*display:\s*none;/s);
    expect(stylesheet).not.toMatch(/\.fieldRow\s*>\s*:last-child\s*\{/s);
  });
});
