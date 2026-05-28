import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  SettingsForm,
  SettingsFormActions,
  SettingsFormField,
  SettingsFormInput,
  SettingsFormSelect
} from './settings-form';

describe('settings form controls', () => {
  it('renders cold-matte form controls with low-radius dense settings rhythm', () => {
    const html = renderToStaticMarkup(
      <SettingsForm data-setting-config-form="cold-settings-form">
        <SettingsFormField label="系统语言">
          <SettingsFormSelect value="zh-CN" onChange={() => {}}>
            <option value="zh-CN">简体中文</option>
          </SettingsFormSelect>
        </SettingsFormField>
        <SettingsFormField label="访问密钥">
          <SettingsFormInput value="ak" onChange={() => {}} />
        </SettingsFormField>
        <SettingsFormActions data-setting-config-actions="standard-equal-buttons">
          <button type="submit">确认更新</button>
        </SettingsFormActions>
      </SettingsForm>
    );

    expect(html).toContain('data-settings-form-owner="cold-settings-form-owner"');
    expect(html).toContain('data-setting-config-form="cold-settings-form"');
    expect(html).toContain('data-settings-form-field="cold-form-field"');
    expect(html).toContain('data-settings-form-control="cold-input-control"');
    expect(html).toContain('data-settings-form-control="cold-select-control"');
    expect(html).toContain('data-settings-form-select-width="angular-400px"');
    expect(html).toContain('data-settings-form-select-style="angular-centered-bold"');
    expect(html).toContain('data-settings-form-select-dropdown-style="angular-bold-larger"');
    expect(html).toContain('data-cold-select-owner="cold-custom-select"');
    expect(html).toContain('data-cold-select-icon="chevron"');
    expect(html).toContain('appearance-none');
    expect(html).toContain('data-setting-config-actions="standard-equal-buttons"');
    expect(html).toContain('rounded-[4px]');
    expect(html).toContain('rounded-[3px]');
    expect(html).toContain('border-[#2b3039]');
    expect(html).toContain('bg-[#101217]');
    expect(html).toContain('text-[#a9b0bb]');
    expect(html).not.toContain('rounded-[2px]');
    expect(html).not.toContain('border-[#20232b]');
    expect(html).not.toContain('bg-[#121317]');
  });

  it('keeps the settings form owner independent from workbench toolbar primitives', () => {
    const source = readFileSync(resolve(process.cwd(), 'components/settings/settings-form.tsx'), 'utf8');

    expect(source).toContain('data-settings-form-owner="cold-settings-form-owner"');
    expect(source).toContain('data-settings-form-control="cold-input-control"');
    expect(source).toContain('data-settings-form-control="cold-select-control"');
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
