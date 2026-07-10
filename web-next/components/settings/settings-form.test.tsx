import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  SettingsForm,
  SettingsFormActionHelp,
  SettingsFormActions,
  SettingsFormFeedback,
  SettingsFormField,
  SettingsFormInput,
  SettingsFormSelect
} from './settings-form';

describe('settings form controls', () => {
  it('renders hertzbeat-ui-matte form controls with low-radius dense settings rhythm', () => {
    const html = renderToStaticMarkup(
      <SettingsForm data-setting-config-form="hertzbeat-ui-settings-form">
        <SettingsFormField label="System language">
          <SettingsFormSelect value="zh-CN" onChange={() => {}}>
            <option value="zh-CN">Simplified Chinese</option>
          </SettingsFormSelect>
        </SettingsFormField>
        <SettingsFormField
          label="Access key"
          requirement={{ tone: 'required', label: 'Required' }}
          inputMode={{ mode: 'manual', label: 'Manual' }}
          help={{
            label: 'Explain access key',
            body: 'Used to authenticate storage writes.',
            impact: 'Missing values block storage writes.'
          }}
        >
          <SettingsFormInput value="ak" onChange={() => {}} />
        </SettingsFormField>
        <SettingsFormActions data-setting-config-actions="standard-equal-buttons">
          <button type="submit">Confirm update</button>
          <SettingsFormActionHelp
            id="apply"
            label="Explain confirm update"
            body="Applies this setting."
            impact="Changing it affects future writes."
          />
        </SettingsFormActions>
      </SettingsForm>
    );

    expect(html).toContain('data-settings-form-owner="hertzbeat-ui-settings-form-owner"');
    expect(html).toContain('data-setting-config-form="hertzbeat-ui-settings-form"');
    expect(html).toContain('data-settings-form-field="hertzbeat-ui-form-field"');
    expect(html).toContain('data-settings-form-control="hertzbeat-ui-input-control"');
    expect(html).toContain('data-settings-form-field-help-placement="inline-label"');
    expect(html).toContain('data-settings-form-field-help-trigger="hertzbeat-ui-field-help"');
    expect(html).toContain('data-settings-form-field-help-style="icon-after-label"');
    expect(html).toContain('data-settings-form-field-help-visual="circle-help-icon"');
    expect(html).toContain('data-settings-form-field-help="hertzbeat-ui-field-tooltip"');
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-describedby=');
    expect(html).toContain('data-settings-form-field-meta="requirement-and-input-mode"');
    expect(html).toContain('data-settings-form-field-requirement="required"');
    expect(html).toContain('data-settings-form-field-input-mode="manual"');
    expect(html).toContain('Required');
    expect(html).toContain('Manual');
    expect(html).toContain('lucide-circle-help');
    expect(html).not.toContain('<span aria-hidden="true">?</span>');
    expect(html).not.toContain('role="img"');
    expect(html).toContain('Explain access key');
    expect(html).toContain('Used to authenticate storage writes.');
    expect(html).toContain('Missing values block storage writes.');
    expect(html).toContain('data-settings-form-control="hertzbeat-ui-select-control"');
    expect(html).toContain('aria-label="System language"');
    expect(html).toContain('aria-label="Access key"');
    expect(html).toContain('data-settings-form-select-width="angular-400px"');
    expect(html).toContain('data-settings-form-select-style="angular-centered-bold"');
    expect(html).toContain('data-settings-form-select-dropdown-style="angular-bold-larger"');
    expect(html).toContain('data-hz-select-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-hz-select-icon="chevron"');
    expect(html).toContain('appearance-none');
    expect(html).toContain('data-setting-config-actions="standard-equal-buttons"');
    expect(html).toContain('data-settings-form-actions-owner="hertzbeat-ui-settings-actions"');
    expect(html).toContain('data-settings-form-action-help="apply"');
    expect(html).toContain('data-settings-form-action-help-trigger="hertzbeat-ui-action-help"');
    expect(html).toContain('data-settings-form-action-help-style="icon-after-action"');
    expect(html).toContain('data-settings-form-action-help-visual="circle-help-icon"');
    expect(html).toContain('data-settings-form-action-help-tooltip="apply"');
    expect(html).toContain('Explain confirm update');
    expect(html).toContain('Applies this setting.');
    expect(html).toContain('Changing it affects future writes.');
    expect(html).toContain('rounded-[4px]');
    expect(html).toContain('rounded-[3px]');
    expect(html).toContain('border-[#2b3039]');
    expect(html).toContain('bg-[#101217]');
    expect(html).toContain('text-[#a9b0bb]');
    expect(html).not.toContain('rounded-[2px]');
    expect(html).not.toContain('border-[#20232b]');
    expect(html).not.toContain('bg-[#121317]');
  });

  it('renders settings feedback with status semantics for novice save and failure states', () => {
    const html = renderToStaticMarkup(
      <div>
        <SettingsFormFeedback tone="success">Saved without changing the draft.</SettingsFormFeedback>
        <SettingsFormFeedback tone="error">Save failed. Backend values were not changed.</SettingsFormFeedback>
        <SettingsFormFeedback>Review required fields before saving.</SettingsFormFeedback>
      </div>
    );

    expect(html).toContain('data-settings-form-feedback="hertzbeat-ui-settings-feedback"');
    expect(html).toContain('data-settings-form-feedback-tone="success"');
    expect(html).toContain('data-settings-form-feedback-tone="error"');
    expect(html).toContain('data-settings-form-feedback-tone="info"');
    expect(html.match(/role="status"/g)).toHaveLength(2);
    expect(html).toContain('role="alert"');
    expect(html.match(/aria-live="polite"/g)).toHaveLength(2);
    expect(html).toContain('aria-live="assertive"');
    expect(html).toContain('Saved without changing the draft.');
    expect(html).toContain('Save failed. Backend values were not changed.');
    expect(html).toContain('Review required fields before saving.');
  });

  it('keeps the settings form owner independent from workbench toolbar primitives', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/settings/settings-form.tsx'), 'utf8');

    expect(source).toContain('data-settings-form-owner="hertzbeat-ui-settings-form-owner"');
    expect(source).toContain('data-settings-form-control="hertzbeat-ui-input-control"');
    expect(source).toContain('data-settings-form-control="hertzbeat-ui-select-control"');
    expect(source).toContain('data-settings-form-actions-owner="hertzbeat-ui-settings-actions"');
    expect(source).toContain('data-settings-form-field-help-placement="inline-label"');
    expect(source).toContain('data-settings-form-field-help-trigger="hertzbeat-ui-field-help"');
    expect(source).toContain('data-settings-form-field-help-style="icon-after-label"');
    expect(source).toContain('data-settings-form-field-help-visual="circle-help-icon"');
    expect(source).toContain('data-settings-form-field-help="hertzbeat-ui-field-tooltip"');
    expect(source).toContain('const helpTooltipId = React.useId();');
    expect(source).toContain("'aria-label': controlElement.props['aria-label'] || label");
    expect(source).toContain('type="button"');
    expect(source).toContain('aria-describedby={helpTooltipId}');
    expect(source).toContain('id={helpTooltipId}');
    expect(source).toContain('data-settings-form-field-meta="requirement-and-input-mode"');
    expect(source).toContain('data-settings-form-field-requirement={requirement.tone}');
    expect(source).toContain('data-settings-form-field-input-mode={inputMode.mode}');
    expect(source).toContain('export function SettingsFormActionHelp');
    expect(source).toContain('data-settings-form-action-help={id}');
    expect(source).toContain('data-settings-form-action-help-trigger="hertzbeat-ui-action-help"');
    expect(source).toContain('data-settings-form-action-help-style="icon-after-action"');
    expect(source).toContain('data-settings-form-action-help-visual="circle-help-icon"');
    expect(source).toContain('data-settings-form-action-help-tooltip={id}');
    expect(source).toContain('data-settings-form-feedback="hertzbeat-ui-settings-feedback"');
    expect(source).toContain('data-settings-form-feedback-tone={tone}');
    expect(source).toContain("tone === 'error' ? 'alert' : 'status'");
    expect(source).toContain("tone === 'error' ? 'assertive' : 'polite'");
    expect(source).toContain("import { CircleHelp } from 'lucide-react'");
    expect(source).toContain('<CircleHelp aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.8} />');
    expect(source).not.toContain('<span aria-hidden="true">?</span>');
    expect(source).not.toContain('onMouseDown={event =>');
    expect(source).not.toContain('role="img"');
    expect(source).toContain('data-settings-form-select-width="angular-400px"');
    expect(source).toContain('data-settings-form-select-style="angular-centered-bold"');
    expect(source).toContain('data-settings-form-select-dropdown-style="angular-bold-larger"');
    expect(source).toContain("from '../ui/select'");
    expect(source).not.toContain('ToolbarInput');
    expect(source).not.toContain('ToolbarNativeSelect');
    expect(source).not.toContain('rounded-[2px]');
    expect(source).not.toContain('border-[#20232b]');
    expect(source).not.toContain('bg-[#121317]');
  });
});
