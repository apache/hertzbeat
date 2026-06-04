import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  SettingsDialogField,
  SettingsDialogForm,
  SettingsDialogInput,
  SettingsDialogSelect
} from './settings-dialog-form';

describe('settings dialog form controls', () => {
  it('renders dialog dropdowns through the shared cold custom select owner', () => {
    const html = renderToStaticMarkup(
      <SettingsDialogForm>
        <SettingsDialogField label="SMS type" required>
          <SettingsDialogSelect defaultValue="tencent" defaultOpen>
            <option value="tencent">Tencent SMS</option>
            <option value="aliyun">Aliyun SMS</option>
          </SettingsDialogSelect>
        </SettingsDialogField>
        <SettingsDialogField label="SecretId" required>
          <SettingsDialogInput value="secret" readOnly />
        </SettingsDialogField>
      </SettingsDialogForm>
    );

    expect(html).toContain('data-settings-dialog-form="hertzbeat-ui-dialog-form"');
    expect(html).toContain('data-settings-dialog-field="hertzbeat-ui-dialog-field"');
    expect(html).toContain('data-settings-dialog-field-layout="angular-label-7-control-12"');
    expect(html).toContain('data-settings-dialog-label-span="7"');
    expect(html).toContain('data-settings-dialog-control-span="12"');
    expect(html).toContain('data-settings-dialog-control="hertzbeat-ui-select-control"');
    expect(html).toContain('data-settings-dialog-control="hertzbeat-ui-input-control"');
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
    expect(source).toContain('md:grid-cols-[7fr_12fr]');
    expect(source).toContain('data-settings-dialog-control="hertzbeat-ui-select-control"');
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
