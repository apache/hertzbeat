import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  AlertAuthoringActionPill,
  AlertAuthoringCallout,
  AlertAuthoringPanel,
  AlertAuthoringToggleRow,
  AlertAuthoringValuePill
} from './alert-authoring-primitives';

describe('alert authoring primitives', () => {
  it('own the cold authoring chrome without workbench primitive fallbacks', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/pages/alert-authoring-primitives.tsx'), 'utf8');
    const html = renderToStaticMarkup(
      <div>
        <AlertAuthoringPanel heading="分组标签">panel-body</AlertAuthoringPanel>
        <AlertAuthoringCallout title="提示" copy="短说明" warning="检查配置" />
        <AlertAuthoringToggleRow>inline-toggle</AlertAuthoringToggleRow>
        <AlertAuthoringActionPill>操作</AlertAuthoringActionPill>
        <AlertAuthoringValuePill>service:checkout</AlertAuthoringValuePill>
      </div>
    );

    expect(html).toContain('data-alert-authoring-panel="cold-panel"');
    expect(html).toContain('data-alert-authoring-callout="cold-panel"');
    expect(html).toContain('data-alert-authoring-toggle-row="inline-control"');
    expect(html).toContain('data-alert-authoring-action-pill="cold-action"');
    expect(html).toContain('data-alert-authoring-value-pill="cold-value"');
    expect(html).not.toContain('data-alert-authoring-textarea="cold-textarea"');
    expect(html).toContain('rounded-[4px]');
    expect(html).toContain('rounded-[3px]');
    expect(html).toContain('h-8');
    expect(html).toContain('panel-body');
    expect(html).toContain('service:checkout');

    expect(source).not.toContain("from '../workbench/primitives'");
    expect(source).not.toContain('WorkbenchToolbarAction');
    expect(source).not.toContain('WorkbenchValuePill');
    expect(source).not.toContain('AlertAuthoringTextarea');
    expect(source).not.toContain('data-alert-authoring-textarea="cold-textarea"');
    expect(source).not.toContain('<textarea');
    expect(source).not.toContain('rounded-[6px]');
    expect(source).not.toContain('min-h-[3.5rem]');
  });
});
