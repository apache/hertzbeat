/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import formStyles from './monitor-editor-form-view.module.css?raw';

describe('monitor editor layout contract', () => {
  it('keeps the dynamic form on one readable column', () => {
    const formRule = formStyles.match(/\.form\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const disclosureRule = formStyles.match(/\.metadataDisclosure\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const actionsRule = formStyles.match(/\.formActions\s*\{(?<body>[^}]*)\}/)?.groups?.body;

    expect(formRule).toBeDefined();
    expect(formRule).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(formRule).toMatch(/max-width:\s*760px/);
    expect(formRule).toMatch(/margin-inline:\s*auto/);
    expect(formRule).not.toMatch(/repeat\(2/);
    expect(disclosureRule).toMatch(/max-width:\s*760px/);
    expect(disclosureRule).toMatch(/margin-inline:\s*auto/);
    expect(actionsRule).toMatch(/max-width:\s*760px/);
    expect(actionsRule).toMatch(/margin-inline:\s*auto/);
  });
});
