/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import formStyles from './monitor-editor-form-view.module.css?raw';
import structuredFieldStyles from './monitor-structured-field.module.css?raw';

describe('monitor editor layout contract', () => {
  it('keeps every dynamic field on the same centered label and control rails', () => {
    const railRule = formStyles.match(/\.formRail\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const formRule = formStyles.match(/\.form\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const rowRule = formStyles.match(/\.formRow\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const labelRule = formStyles.match(/\.fieldLabel\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const disclosureRule = formStyles.match(/\.metadataDisclosure\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const actionsRule = formStyles.match(/\.formActions\s*\{(?<body>[^}]*)\}/)?.groups?.body;

    expect(railRule).toBeDefined();
    expect(railRule).toMatch(/--monitor-editor-label-width:\s*148px/);
    expect(railRule).toMatch(/--monitor-editor-control-width:\s*360px/);
    expect(railRule).toMatch(/--monitor-editor-control-offset:\s*calc/);
    expect(railRule).toMatch(/--monitor-editor-row-width:\s*calc/);
    expect(railRule).toMatch(/max-width:\s*720px/);
    expect(railRule).toMatch(/margin-inline:\s*auto/);
    expect(formRule).toBeDefined();
    expect(formRule).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(formRule).not.toMatch(/repeat\(2/);
    expect(rowRule).toMatch(
      /grid-template-columns:\s*var\(--monitor-editor-label-width\)\s+minmax\(0,\s*var\(--monitor-editor-control-width\)\)/
    );
    expect(labelRule).toMatch(/justify-content:\s*flex-end/);
    expect(labelRule).toMatch(/text-align:\s*right/);
    expect(disclosureRule).toMatch(/padding-left:\s*var\(--monitor-editor-control-offset\)/);
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
