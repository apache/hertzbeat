/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import historyStyles from './monitor-history-results.module.css?raw';
import cardStyles from './monitor-realtime-card.module.css?raw';
import segmentedStyles from './monitor-segmented-switch.module.css?raw';
import tableStyles from './monitor-realtime-table.module.css?raw';
import workbenchStyles from './monitor-metric-workbench.module.css?raw';

describe('monitor metric visual contract', () => {
  it('uses the workbench container rather than the browser viewport to protect readable card widths', () => {
    const gridRule = workbenchStyles.match(/\.realtimeGrid\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const workspaceRule = workbenchStyles.match(/\.currentValueWorkspace\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const workbenchRule = workbenchStyles.match(/\.workbench\s*\{(?<body>[^}]*)\}/)?.groups?.body;

    expect(gridRule).toMatch(/grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
    expect(workspaceRule).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(workbenchRule).toMatch(/container-name:\s*monitor-workbench/);
    expect(workbenchRule).toMatch(/container-type:\s*inline-size/);
    expect(workbenchStyles).toMatch(
      /@container monitor-workbench \(max-width:\s*1080px\)[\s\S]*?\.realtimeGrid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/
    );
    expect(workbenchStyles).toMatch(
      /@container monitor-workbench \(max-width:\s*720px\)[\s\S]*?\.realtimeGrid\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/
    );
  });

  it('continues realtime column boundaries through table body cells', () => {
    expect(cardStyles).toMatch(/\.realtimeGroup\s+:global\(\.ant-table-tbody\s*>\s*tr\s*>\s*td:not\(:last-child\)\)/);
    expect(cardStyles).toMatch(/border-inline-end:\s*1px solid var\(--hb-border-subtle\)/);
  });

  it('uses native panel overflow and an in-flow history panel instead of expansion surfaces or a fixed tray', () => {
    const bodyRule = cardStyles.match(/\.realtimeGroupBody\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const valueRule = tableStyles.match(/\.metricValueText\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const canvasRule = historyStyles.match(/\.historyChartCanvas,\s*\n\.historyChartState\s*\{(?<body>[^}]*)\}/)?.groups
      ?.body;
    const trayRule = historyStyles.match(/\.selectedHistoryTray\s*\{(?<body>[^}]*)\}/)?.groups?.body;

    expect(bodyRule).toMatch(/overflow:\s*auto/);
    expect(cardStyles).not.toMatch(/\.groupExpansion\s*\{/);
    expect(valueRule).toMatch(/text-overflow:\s*ellipsis/);
    expect(canvasRule).toMatch(/height:\s*190px/);
    expect(trayRule).not.toMatch(/grid-template-columns/);
    expect(trayRule).toMatch(/position:\s*relative/);
    expect(trayRule).not.toMatch(/inset-inline-start|inset-inline-end|bottom/);
    expect(historyStyles).not.toMatch(/\.historySummary\s*\{/);
  });

  it('presents chart statistics as a quiet inline legend instead of detached pills', () => {
    const statisticsRules = [...historyStyles.matchAll(/\.historyStatistics\s*\{(?<body>[^}]*)\}/g)];
    const statisticsRule = statisticsRules.find(rule => rule.groups?.body?.includes('min-height'))?.groups?.body;
    const itemRule = historyStyles.match(/\.historyStatistic\s*\{(?<body>[^}]*)\}/)?.groups?.body;

    expect(statisticsRule).toMatch(/justify-content:\s*flex-start/);
    expect(statisticsRule).toMatch(/gap:\s*var\(--hb-space-4\)/);
    expect(itemRule).toMatch(/display:\s*inline-flex/);
    expect(itemRule).not.toMatch(/border-radius|background/);
  });

  it('uses one token-backed segmented language for metric and history choices', () => {
    const rootRule = segmentedStyles.match(/\.switch:global\(\.ant-segmented\)\s*\{(?<body>[^}]*)\}/)?.groups?.body;
    const selectedRule = segmentedStyles.match(
      /\.switch\s+:global\(\.ant-segmented-item-selected\)\s*\{(?<body>[^}]*)\}/
    )?.groups?.body;

    expect(rootRule).toMatch(/border:\s*1px solid var\(--hb-border-subtle\)/);
    expect(rootRule).toMatch(/background:\s*var\(--hb-bg-hover\)/);
    expect(selectedRule).toMatch(/background:\s*var\(--hb-brand-accent\)/);
    expect(selectedRule).toMatch(/color:\s*var\(--hb-text-on-accent\)/);
  });
});
