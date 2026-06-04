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
        <AlertAuthoringPanel heading="Group labels">panel-body</AlertAuthoringPanel>
        <AlertAuthoringCallout title="Hint" copy="Short note" warning="Review config" />
        <AlertAuthoringToggleRow>inline-toggle</AlertAuthoringToggleRow>
        <AlertAuthoringActionPill>Action</AlertAuthoringActionPill>
        <AlertAuthoringValuePill>service:checkout</AlertAuthoringValuePill>
      </div>
    );

    expect(html).toContain('data-alert-authoring-panel="hertzbeat-ui-panel"');
    expect(html).toContain('data-alert-authoring-callout="hertzbeat-ui-panel"');
    expect(html).toContain('data-alert-authoring-toggle-row="inline-control"');
    expect(html).toContain('data-alert-authoring-action-pill="hertzbeat-ui-action"');
    expect(html).toContain('data-alert-authoring-value-pill="hertzbeat-ui-value"');
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
