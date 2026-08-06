/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';

import yamlEditorStyles from '@/shared/yaml-editor/yaml-code-editor.module.css?raw';

import catalogStyles from '../components/monitor-definition-catalog.module.css?raw';
import editorSource from '../components/monitor-definition-editor.tsx?raw';
import workspaceSource from '../components/monitor-definition-workspace.tsx?raw';
import pageStyles from './monitor-definition-page.module.css?raw';

describe('monitor definition split layout contract', () => {
  it('bounds the desktop workspace to the viewport and gives each pane its own scroll boundary', () => {
    const layout = cssRule(pageStyles, 'layout');
    const selector = cssRule(pageStyles, 'selector');
    const workspace = cssRule(pageStyles, 'workspace');
    const catalog = cssRule(catalogStyles, 'list');
    const yaml = cssRule(yamlEditorStyles, 'editor');

    expect(layout).toMatch(/height:\s*clamp\([^;]*100dvh/);
    expect(layout).toMatch(/overflow:\s*hidden/);
    expect(selector).toMatch(/min-height:\s*0/);
    expect(selector).toMatch(/overflow:\s*hidden/);
    expect(workspace).toMatch(/min-height:\s*0/);
    expect(workspace).toMatch(/overflow:\s*auto/);
    expect(catalog).toMatch(/min-height:\s*0/);
    expect(catalog).toMatch(/overflow:\s*auto/);
    expect(`${workspaceSource}\n${editorSource}`).toMatch(/minHeight="clamp\([^"]*100dvh/);
    expect(yaml).toMatch(/overflow:\s*hidden/);
    expect(yamlEditorStyles).toMatch(/\.editor\s+:global\(\.cm-editor\)\s*\{[^}]*height:\s*100%/);
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
