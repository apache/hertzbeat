import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  SettingsDialogActionHelp,
  SettingsDialogField,
  SettingsDialogFooter,
  SettingsDialogForm,
  SettingsDialogInput,
  SettingsDialogSelect,
  SettingsDialogToggle
} from './settings-dialog-form';

describe('settings dialog form controls', () => {
  it('renders dialog dropdowns through the shared cold custom select owner', () => {
    const html = renderToStaticMarkup(
      <SettingsDialogForm>
        <SettingsDialogField
          label="SMS type"
          required
          requirement={{ tone: 'required', label: 'Required' }}
          inputMode={{ mode: 'selection', label: 'Selection' }}
        >
          <SettingsDialogSelect defaultValue="tencent" defaultOpen>
            <option value="tencent">Tencent SMS</option>
            <option value="aliyun">Aliyun SMS</option>
          </SettingsDialogSelect>
        </SettingsDialogField>
        <SettingsDialogField
          label="SecretId"
          required
          help={{
            label: 'Explain SecretId',
            body: 'Provider credential used to send SMS.',
            impact: 'Wrong credentials stop all SMS notifications.'
          }}
          requirement={{ tone: 'required', label: 'Required' }}
          inputMode={{ mode: 'manual', label: 'Manual' }}
        >
          <SettingsDialogInput value="secret" readOnly />
        </SettingsDialogField>
        <SettingsDialogField label="Enabled">
          <SettingsDialogToggle checked={false} onCheckedChange={() => undefined} />
        </SettingsDialogField>
        <SettingsDialogActionHelp
          id="sms-save"
          label="Explain save"
          body="Saves SMS delivery settings."
          impact="Wrong values can stop SMS notifications."
        />
        <SettingsDialogFooter>
          <button type="button">Cancel</button>
          <button type="submit">Save</button>
        </SettingsDialogFooter>
      </SettingsDialogForm>
    );

    expect(html).toContain('data-settings-dialog-form="hertzbeat-ui-dialog-form"');
    expect(html).toContain('data-settings-dialog-field="hertzbeat-ui-dialog-field"');
    expect(html).toContain('data-settings-dialog-field-layout="angular-label-7-control-12"');
    expect(html).toContain('data-settings-dialog-label-span="7"');
    expect(html).toContain('data-settings-dialog-control-span="12"');
    expect(html).toContain('data-settings-dialog-field-help-placement="inline-label"');
    expect(html).toContain('data-settings-dialog-field-help-trigger="hertzbeat-ui-field-help"');
    expect(html).toContain('data-settings-dialog-field-help-style="icon-after-label"');
    expect(html).toContain('data-settings-dialog-field-help-visual="circle-help-icon"');
    expect(html).toContain('data-settings-dialog-field-help-icon="lucide-circle-help"');
    expect(html).toContain('data-settings-dialog-field-help="hertzbeat-ui-field-tooltip"');
    expect(html).toContain('aria-describedby=');
    expect(html).not.toContain('data-settings-dialog-field-help-visual="borderless-question"');
    expect(html).toContain('data-settings-dialog-field-meta="requirement-and-input-mode"');
    expect(html).toContain('data-settings-dialog-field-requirement="required"');
    expect(html).toContain('data-settings-dialog-field-input-mode="selection"');
    expect(html).toContain('data-settings-dialog-field-input-mode="manual"');
    expect(html).toContain('Required');
    expect(html).toContain('Selection');
    expect(html).toContain('Manual');
    expect(html).not.toContain('>?</button>');
    expect(html).not.toContain('role="img"');
    expect(html).toContain('Explain SecretId');
    expect(html).toContain('Provider credential used to send SMS.');
    expect(html).toContain('Wrong credentials stop all SMS notifications.');
    expect(html).toContain('data-settings-dialog-control="hertzbeat-ui-select-control"');
    expect(html).toContain('data-settings-dialog-control="hertzbeat-ui-input-control"');
    expect(html).toContain('aria-label="SMS type"');
    expect(html).toContain('aria-label="SecretId"');
    expect(html).toContain('role="switch" aria-label="Enabled"');
    expect(html).toContain('data-settings-dialog-action-help="sms-save"');
    expect(html).toContain('data-settings-dialog-action-help-trigger="hertzbeat-ui-action-help"');
    expect(html).toContain('data-settings-dialog-action-help-style="icon-after-action"');
    expect(html).toContain('data-settings-dialog-action-help-visual="circle-help-icon"');
    expect(html).toContain('data-settings-dialog-action-help-tooltip="sms-save"');
    expect(html).toContain('Saves SMS delivery settings.');
    expect(html).toContain('Wrong values can stop SMS notifications.');
    expect(html).toContain('data-settings-dialog-footer-owner="hertzbeat-ui-dialog-footer"');
    expect(html).toContain('data-hz-select-owner="hertzbeat-ui-select"');
    expect(html).toContain('data-hz-select-control="custom-trigger"');
    expect(html).toContain('data-hz-select-listbox="custom-menu"');
    expect(html).toContain('appearance-none');
    expect(html).toContain('h-8');
    expect(html).toContain('rounded-[3px]');
    expect(html).toContain('border-[#2b3039]');
    expect(html).toContain('bg-[#101217]');
    expect(html).toContain('md:grid-cols-[7fr_12fr]');
    expect(html).not.toContain('h-10');
    expect(html).not.toContain('rounded-[2px]');
    expect(html).not.toContain('bg-[var(--ops-surface-raised)]');
    expect(html).not.toContain('md:grid-cols-[180px_minmax(0,1fr)]');
  });

  it('keeps the dialog form owner wired to the shared select component', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/settings/settings-dialog-form.tsx'), 'utf8');

    expect(source).toContain("from '../ui/select'");
    expect(source).toContain("layout = 'horizontal'");
    expect(source).toContain("layout?: 'horizontal' | 'vertical'");
    expect(source).toContain("data-settings-dialog-field-layout={isVertical ? 'angular-vertical-form' : 'angular-label-7-control-12'}");
    expect(source).toContain("'angular-vertical-form' : 'angular-label-7-control-12'");
    expect(source).toContain("data-settings-dialog-label-span={isVertical ? 'vertical' : '7'}");
    expect(source).toContain("data-settings-dialog-control-span={isVertical ? 'vertical' : '12'}");
    expect(source).toContain('data-settings-dialog-field-help-placement="inline-label"');
    expect(source).toContain('data-settings-dialog-field-help-trigger="hertzbeat-ui-field-help"');
    expect(source).toContain('data-settings-dialog-field-help-style="icon-after-label"');
    expect(source).toContain('data-settings-dialog-field-help-visual="circle-help-icon"');
    expect(source).toContain('data-settings-dialog-field-help-icon="lucide-circle-help"');
    expect(source).toContain('data-settings-dialog-field-help="hertzbeat-ui-field-tooltip"');
    expect(source).not.toContain('data-settings-dialog-field-help-visual="borderless-question"');
    expect(source).toContain('aria-describedby={helpTooltipId}');
    expect(source).toContain('id={helpTooltipId}');
    expect(source).toContain('data-settings-dialog-field-meta="requirement-and-input-mode"');
    expect(source).toContain("'aria-label': controlElement.props['aria-label'] || label");
    expect(source).toContain('aria-label={ariaLabel}');
    expect(source).toContain('data-settings-dialog-field-requirement={requirement.tone}');
    expect(source).toContain('data-settings-dialog-field-input-mode={inputMode.mode}');
    expect(source).toContain('export function SettingsDialogActionHelp');
    expect(source).toContain('data-settings-dialog-action-help={id}');
    expect(source).toContain('data-settings-dialog-action-help-trigger="hertzbeat-ui-action-help"');
    expect(source).toContain('data-settings-dialog-action-help-style="icon-after-action"');
    expect(source).toContain('data-settings-dialog-action-help-visual="circle-help-icon"');
    expect(source).toContain('data-settings-dialog-action-help-tooltip={id}');
    expect(source).toContain("import { CircleHelp } from 'lucide-react'");
    expect(source).toContain('<CircleHelp aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.8} />');
    expect(source).toContain('const helpTooltipId = React.useId();');
    expect(source).toContain('type="button"');
    expect(source).toContain('md:grid-cols-[7fr_12fr]');
    expect(source).toContain('data-settings-dialog-control="hertzbeat-ui-select-control"');
    expect(source).toContain('data-settings-dialog-footer-owner="hertzbeat-ui-dialog-footer"');
    expect(source).not.toContain('<select');
    expect(source).not.toContain('h-10');
    expect(source).not.toContain('rounded-[2px]');
    expect(source).not.toContain('md:grid-cols-[180px_minmax(0,1fr)]');
  });

  it('supports the Angular vertical form layout used by token generation dialogs', () => {
    const html = renderToStaticMarkup(
      <SettingsDialogForm>
        <SettingsDialogField label="Token name" required layout="vertical">
          <SettingsDialogInput value="ops-token" readOnly />
        </SettingsDialogField>
        <SettingsDialogField label="Expiration time" layout="vertical">
          <SettingsDialogSelect defaultValue="-1" defaultOpen>
            <option value="-1">Never expires</option>
            <option value="604800">7 days</option>
          </SettingsDialogSelect>
        </SettingsDialogField>
      </SettingsDialogForm>
    );

    expect(html).toContain('data-settings-dialog-field-layout="angular-vertical-form"');
    expect(html).toContain('data-settings-dialog-label-span="vertical"');
    expect(html).toContain('data-settings-dialog-control-span="vertical"');
    expect(html).toContain('data-settings-dialog-control="hertzbeat-ui-input-control"');
    expect(html).toContain('data-settings-dialog-control="hertzbeat-ui-select-control"');
    expect(html).not.toContain('md:grid-cols-[7fr_12fr]');
  });
});
