/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import operationalPageStyles from '@/shared/operational-page/operational-page.module.css?raw';

import formStyles from './monitor-editor-form-view.module.css?raw';
import structuredFieldStyles from './monitor-structured-field.module.css?raw';

describe('monitor editor layout contract', () => {
  it('keeps every dynamic field on the same centered label and control rails', () => {
    const railRule = cssRuleBody(formStyles, /\.formRail\s*\{(?<body>[^}]*)\}/);
    const formRule = cssRuleBody(formStyles, /\.form\s*\{(?<body>[^}]*)\}/);
    const rowRule = cssRuleBody(formStyles, /\.formRow\s*\{(?<body>[^}]*)\}/);
    const labelRule = cssRuleBody(formStyles, /\.fieldLabel\s*\{(?<body>[^}]*)\}/);
    const disclosureRule = cssRuleBody(formStyles, /\.metadataDisclosure\s*\{(?<body>[^}]*)\}/);
    const actionsRule = cssRuleBody(formStyles, /\.formActions\s*\{(?<body>[^}]*)\}/);

    expect(railRule).toBeDefined();
    expect(operationalPageStyles).toMatch(/--hb-form-label-width:\s*148px/);
    expect(operationalPageStyles).toMatch(/--hb-form-control-width:\s*360px/);
    expect(operationalPageStyles).toMatch(/--hb-form-control-offset:\s*calc/);
    expect(operationalPageStyles).toMatch(/--hb-form-row-width:\s*calc/);
    expect(railRule).toMatch(/max-width:\s*var\(--hb-form-rail-width\)/);
    expect(railRule).toMatch(/margin-inline:\s*auto/);
    expect(formRule).toBeDefined();
    expect(formRule).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(formRule).not.toMatch(/repeat\(2/);
    expect(rowRule).toMatch(
      /grid-template-columns:\s*var\(--hb-form-label-width\)\s+minmax\(0,\s*var\(--hb-form-control-width\)\)/
    );
    expect(labelRule).toMatch(/justify-content:\s*flex-end/);
    expect(labelRule).toMatch(/text-align:\s*right/);
    expect(disclosureRule).toMatch(/padding-left:\s*var\(--hb-form-control-offset\)/);
    expect(actionsRule).toBeDefined();
  });

  it('stacks labels above controls on narrow viewports', () => {
    expect(formStyles).toMatch(
      /@media\s*\(max-width:\s*700px\)[\s\S]*\.formRow\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/
    );
    expect(formStyles).toMatch(
      /@media\s*\(max-width:\s*700px\)[\s\S]*\.fieldLabel\s*\{[^}]*justify-content:\s*flex-start/
    );
  });

  it('lets structured key-value and metric rows fit the same control rail', () => {
    expect(structuredFieldStyles).toMatch(/\.stack\s*\{[^}]*width:\s*100%/);
    expect(structuredFieldStyles).toMatch(
      /\.row\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)\s+max-content/
    );
    expect(structuredFieldStyles).toMatch(
      /\.metricRow\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.2fr\)[^}]*max-content/
    );
  });
});

function cssRuleBody(source: string, pattern: RegExp) {
  return source.match(pattern)?.groups?.body;
}
