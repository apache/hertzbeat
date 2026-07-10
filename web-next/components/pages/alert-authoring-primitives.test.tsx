import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  AlertAuthoringActionPill,
  AlertAuthoringCallout,
  AlertAuthoringInlineHelp,
  AlertAuthoringPanel,
  AlertAuthoringRequiredMark,
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
        <AlertAuthoringInlineHelp id="field-help" label="Explain field" body="Field help" impact="Save impact" />
        <AlertAuthoringRequiredMark />
        <AlertAuthoringActionPill>Action</AlertAuthoringActionPill>
        <AlertAuthoringValuePill>service:checkout</AlertAuthoringValuePill>
      </div>
    );

    expect(html).toContain('data-alert-authoring-panel="hertzbeat-ui-panel"');
    expect(html).toContain('data-alert-authoring-callout="hertzbeat-ui-panel"');
    expect(html).toContain('data-alert-authoring-callout-tone="warning"');
    expect(html).toContain('data-alert-authoring-toggle-row="inline-control"');
    expect(html).toContain('data-alert-authoring-field-help-placement="inline-label"');
    expect(html).toContain('<button');
    expect(html).toContain('type="button"');
    expect(html).toContain('data-alert-authoring-field-help-trigger="hertzbeat-ui-field-help"');
    expect(html).toContain('data-alert-authoring-field-help-button="icon-after-label"');
    expect(html).toContain('data-alert-authoring-field-help-visual="circle-help-icon"');
    expect(html).toContain('data-alert-authoring-field-help-icon="lucide-circle-help"');
    expect(html).toContain('lucide-circle-help');
    expect(html).toContain('data-alert-authoring-field-help="hertzbeat-ui-field-tooltip"');
    expect(html).not.toContain('>?</span>');
    expect(html).toContain('data-alert-authoring-required-mark="hertzbeat-ui-required"');
    expect(html).toContain('aria-hidden="true"');
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
    expect(source).toContain('CircleHelp');
    expect(source).toContain('data-alert-authoring-field-help-button="icon-after-label"');
    expect(source).toContain('data-alert-authoring-field-help-visual="circle-help-icon"');
    expect(source).toContain('data-alert-authoring-field-help-icon="lucide-circle-help"');
    expect(source).not.toContain('literal-question-after-label');
    expect(source).not.toContain('data-alert-authoring-field-help-visual="borderless-question"');
    expect(source).toContain('border-0 bg-transparent');
    expect(source).not.toContain('event.preventDefault();');
    expect(source).toContain('event.stopPropagation();');
  });

  it('announces error callouts without turning ordinary warnings into alerts', () => {
    const warningHtml = renderToStaticMarkup(
      <AlertAuthoringCallout data-alert-authoring-test-warning="true" warning="Preview before saving" />
    );
    const errorHtml = renderToStaticMarkup(
      <AlertAuthoringCallout data-alert-authoring-test-error="true" tone="error" warning="Save failed" />
    );

    expect(warningHtml).toContain('data-alert-authoring-callout-tone="warning"');
    expect(warningHtml).not.toContain('role="alert"');
    expect(warningHtml).not.toContain('aria-live="assertive"');
    expect(errorHtml).toContain('data-alert-authoring-callout-tone="error"');
    expect(errorHtml).toContain('role="alert"');
    expect(errorHtml).toContain('aria-live="assertive"');
    expect(errorHtml).toContain('text-[#fca5a5]');
  });
});
