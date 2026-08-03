/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import workbenchStyles from './monitor-metric-workbench.module.css?raw';

describe('monitor metric visual contract', () => {
  it('keeps history charts in the established two-column desktop layout', () => {
    const historyRule = workbenchStyles.match(/\.historyGrid\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const responsiveRules = workbenchStyles.match(/@media[\s\S]*$/)?.[0];

    expect(historyRule).toBeDefined();
    expect(historyRule).toMatch(/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    expect(responsiveRules).toMatch(/\.historyGrid[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  });

  it('continues realtime column boundaries through table body cells', () => {
    expect(workbenchStyles).toMatch(
      /\.realtimeGroup\s+:global\(\.ant-table-tbody\s*>\s*tr\s*>\s*td:not\(:last-child\)\)/
    );
    expect(workbenchStyles).toMatch(/border-inline-end:\s*1px solid var\(--hb-border-subtle\)/);
  });
});
