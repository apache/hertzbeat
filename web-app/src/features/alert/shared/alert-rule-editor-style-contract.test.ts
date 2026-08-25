/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import styles from './alert-rule-editor.module.css?raw';

describe('Alert Rule editor source-parity style contract', () => {
  it('keeps the source-sized binding action instead of stretching it across the form control', () => {
    expect(styles).toMatch(/\.bindingManageButton\s*\{[\s\S]*?justify-self:\s*start/);
  });

  it('does not introduce a nested scrollbar around the expert expression textarea', () => {
    expect(styles).toMatch(/\.conditionAuthoringControl\s*\{[\s\S]*?overflow:\s*visible/);
  });

  it('reserves space for the periodic PromQL character counter above the preview action', () => {
    expect(styles).toMatch(
      /\.queryEditor\s*>\s*:global\(\.ant-input-textarea-show-count\)\s*\{[\s\S]*?margin-bottom:\s*16px/
    );
  });

  it('reserves source-sized space below the alarm-content character counter', () => {
    expect(styles).toMatch(
      /\.templateEditor\s*>\s*:global\(\.ant-input-textarea-show-count\)\s*\{[\s\S]*?margin-bottom:\s*16px/
    );
  });

  it('keeps the source query-description rhythm and compact period control', () => {
    expect(styles).toMatch(/\.queryExamplesTitle\s*\{[\s\S]*?margin-top:\s*12px/);
    expect(styles).toMatch(/\.numberWithUnit\s*>\s*:global\(\.ant-input-number\)\s*\{[\s\S]*?width:\s*90px/);
  });

  it('uses the source 7/12/5 grid without shrinking the control column with an extra gutter', () => {
    expect(styles).toMatch(/\.metricSection\s*>\s*label\s*\{[\s\S]*?column-gap:\s*0/);
    expect(styles).toMatch(/\.bindingField\s*\{[\s\S]*?column-gap:\s*0/);
    expect(styles).toMatch(/\.fieldLabel\s*\{[\s\S]*?padding-inline-end:\s*12px/);
  });

  it('removes desktop label gutter and alignment inside the single-column mobile layout', () => {
    expect(styles).toMatch(
      /@media[\s\S]*?\.bindingLabel[\s\S]*?justify-content:\s*flex-start[\s\S]*?padding-inline-end:\s*0/
    );
  });
});
