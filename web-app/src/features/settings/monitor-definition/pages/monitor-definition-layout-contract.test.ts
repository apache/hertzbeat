/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import catalogStyles from '../components/monitor-definition-catalog.module.css?raw';
import workspaceStyles from '../components/monitor-definition-workspace.module.css?raw';
import pageStyles from './monitor-definition-page.module.css?raw';

describe('monitor definition split layout contract', () => {
  it('bounds the desktop workspace to the viewport and gives each pane its own scroll boundary', () => {
    const layout = cssRule(pageStyles, 'layout');
    const selector = cssRule(pageStyles, 'selector');
    const workspace = cssRule(pageStyles, 'workspace');
    const catalog = cssRule(catalogStyles, 'list');
    const yaml = pageStylesForYaml(workspaceStyles);

    expect(layout).toMatch(/height:\s*clamp\([^;]*100dvh/);
    expect(layout).toMatch(/overflow:\s*hidden/);
    expect(selector).toMatch(/min-height:\s*0/);
    expect(selector).toMatch(/overflow:\s*hidden/);
    expect(workspace).toMatch(/min-height:\s*0/);
    expect(workspace).toMatch(/overflow:\s*auto/);
    expect(catalog).toMatch(/min-height:\s*0/);
    expect(catalog).toMatch(/overflow:\s*auto/);
    expect(yaml).toMatch(/height:\s*clamp\([^;]*100dvh/);
    expect(yaml).toMatch(/overflow:\s*auto/);
  });

  it('returns to natural document flow when the split workspace stacks on narrow screens', () => {
    expect(pageStyles).toMatch(
      /@media\s*\(max-width:\s*760px\)[\s\S]*\.layout\s*\{[^}]*height:\s*auto[^}]*overflow:\s*visible/
    );
    expect(pageStyles).toMatch(/@media\s*\(max-width:\s*760px\)[\s\S]*\.workspace\s*\{[^}]*overflow:\s*visible/);
  });
});

function cssRule(source: string, name: string) {
  return source.match(new RegExp(`\\.${name}\\s*\\{(?<body>[^}]*)\\}`))?.groups?.body;
}

function pageStylesForYaml(source: string) {
  return source.match(/\.editor,\s*\.readOnly\s*\{(?<body>[^}]*)\}/)?.groups?.body;
}
