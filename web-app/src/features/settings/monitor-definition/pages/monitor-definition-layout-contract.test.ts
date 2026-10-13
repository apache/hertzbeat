/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, expect, it } from 'vitest';

import yamlEditorStyles from '@/shared/yaml-editor/yaml-editor.module.css?raw';

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
    expect(yamlEditorStyles).toMatch(/\.editor\s+:global\(\.cm-mergeView\)\s*\{[^}]*overflow:\s*auto/);
  });

  it('returns to natural document flow when the split workspace stacks on narrow screens', () => {
    expect(pageStyles).toMatch(
      /@media\s*\(max-width:\s*760px\)[\s\S]*\.layout\s*\{[^}]*height:\s*auto[^}]*overflow:\s*visible/
    );
    expect(pageStyles).toMatch(/@media\s*\(max-width:\s*760px\)[\s\S]*\.workspace\s*\{[^}]*overflow:\s*visible/);
  });

  it('uses a line-only marker for the selected catalog definition', () => {
    const selected = catalogStyles.match(/\.item\.itemSelected,[\s\S]*?\{[^}]*\}/)?.[0] ?? '';

    expect(selected).toMatch(/box-shadow:\s*inset 2px 0 0 var\(--hb-brand-accent\)/);
    expect(selected).toMatch(/background:\s*transparent/);
    expect(selected).not.toMatch(/background:\s*var\(--hb-nav-selected\)/);
  });
});

function cssRule(source: string, name: string) {
  return source.match(new RegExp(`\\.${name}\\s*\\{(?<body>[^}]*)\\}`))?.groups?.body;
}
