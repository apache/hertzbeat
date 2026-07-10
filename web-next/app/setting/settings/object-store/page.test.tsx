// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../../test/i18n-test-helper';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockState = vi.hoisted(() => ({
  lastLoad: null as null | (() => Promise<unknown>),
  renderData: {
    config: {
      type: 'OBS',
      config: {
        accessKey: 'old-ak',
        secretKey: 'old-sk',
        bucketName: 'old-bucket',
        endpoint: 'https://old.obs.example.com',
        savePath: 'old-path'
      }
    }
  }
}));

const apiMessageGet = vi.hoisted(() => vi.fn());
const apiMessagePost = vi.hoisted(() => vi.fn());

vi.mock('../../../../components/providers/i18n-provider', () => ({
  useI18n: () => ({
    t: createTranslatorMock({
      locale: 'zh-CN'
    })
  })
}));

vi.mock('../../../../components/workbench/client-workbench', () => ({
  ClientWorkbench: ({
    children,
    load
  }: {
    children: (data: any) => React.ReactNode;
    load: () => Promise<unknown>;
  }) => {
    mockState.lastLoad = load;
    return <div data-client-workbench="true">{children(mockState.renderData)}</div>;
  }
}));

vi.mock('../../../../components/settings/settings-console-shell', () => ({
  SettingsConsoleTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-settings-console-title="true">{children}</div>
  )
}));

vi.mock('../../../../components/settings/settings-form', () => ({
  SettingsForm: ({ children, ...props }: any) => <form data-settings-form-owner="cold-settings-form-owner" {...props}>{children}</form>,
  SettingsFormField: ({ label, children, help, requirement, inputMode }: any) => (
    <label data-settings-form-field="cold-form-field" data-settings-form-label={label}>
      <span>{label}</span>
      {help ? (
        <span data-settings-form-field-help="hertzbeat-ui-field-tooltip" aria-label={help.label}>
          <span>{help.body}</span>
          <span>{help.impact}</span>
        </span>
      ) : null}
      {requirement ? (
        <span data-settings-form-field-requirement={requirement.tone}>{requirement.label}</span>
      ) : null}
      {inputMode ? (
        <span data-settings-form-field-input-mode={inputMode.mode}>{inputMode.label}</span>
      ) : null}
      {children}
    </label>
  ),
  SettingsFormInput: (props: any) => <input data-settings-form-control="cold-input-control" {...props} />,
  SettingsFormSelect: ({ children, ...props }: any) => <select data-settings-form-control="cold-select-control" {...props}>{children}</select>,
  SettingsFormFeedback: ({ children, tone = 'info', ...props }: any) => (
    <div data-settings-form-feedback="hertzbeat-ui-settings-feedback" data-settings-form-feedback-tone={tone} {...props}>
      {children}
    </div>
  ),
  SettingsFormActionHelp: ({ id, label, body, impact }: any) => (
    <span
      data-settings-form-action-help={id}
      data-settings-form-action-help-trigger="hertzbeat-ui-action-help"
      data-settings-form-action-help-tooltip={id}
      aria-label={label}
    >
      <span>{body}</span>
      <span>{impact}</span>
    </span>
  ),
  SettingsFormActions: ({ children, ...props }: any) => <div {...props}>{children}</div>
}));

vi.mock('@hertzbeat/ui', () => ({
  HzInlineFeedback: ({ title, description, ...props }: any) => (
    <div data-hz-ui="inline-feedback" {...props}>
      {title}
      {description}
    </div>
  )
}));

vi.mock('../../../../components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('../../../../lib/api-client', () => ({
  apiMessageGet,
  apiMessagePost
}));

describe('setting object store page', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    mockState.lastLoad = null;
    mockState.renderData.config = {
      type: 'OBS',
      config: {
        accessKey: 'old-ak',
        secretKey: 'old-sk',
        bucketName: 'old-bucket',
        endpoint: 'https://old.obs.example.com',
        savePath: 'old-path'
      }
    };
    apiMessageGet.mockReset().mockResolvedValue(mockState.renderData.config);
    apiMessagePost.mockReset();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    root = null;
    container?.remove();
    container = null;
  });

  function setControlledInputValue(input: HTMLInputElement, value: string) {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  it('renders the cold object store form on the shared settings console contract', async () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    const { default: SettingObjectStorePage } = await import('./page');
    const html = renderToStaticMarkup(<SettingObjectStorePage />);

    expect(html).toContain('data-client-workbench="true"');
    expect(html).toContain('data-settings-console-title="true"');
    expect(html).toContain('data-setting-object-store-page="otlp-hertzbeat-ui-object-store"');
    expect(html).toContain('data-setting-object-store-scroll-reset="draft-discard-provider-shrink"');
    expect(html).toContain('data-setting-object-store-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('data-setting-object-store-layout="full-width-settings-form"');
    expect(html).toContain('data-setting-object-store-type-change-contract="angular-reset-config-on-type-change"');
    expect(html).toContain('data-setting-object-store-provider-select-contract="angular-centered-bold-dropdown"');
    expect(html).toContain('data-setting-object-store-form="hertzbeat-ui-settings-form"');
    expect(html).toContain('data-setting-object-store-form-nesting-contract="flat-inside-settings-console-content"');
    expect(html).toContain('class="min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"');
    expect(html).toContain('data-setting-object-store-apply-contract="angular-apply-notify"');
    expect(html).toContain('data-setting-object-store-provider="hertzbeat-ui-provider-select"');
    expect(html).toContain('data-setting-object-store-provider-select="angular-centered-bold-dropdown"');
    expect(html).toContain('data-setting-object-store-type-change="angular-reset-config-on-type-change"');
    expect(html).toContain('data-setting-object-store-obs-fields="hertzbeat-ui-obs-fields"');
    expect(html).toContain('data-setting-object-store-actions="standard-equal-buttons"');
    expect(html).toContain('data-setting-object-store-command-action="discard"');
    expect(html).toContain('data-setting-object-store-command-action="apply"');
    expect(html).toContain('data-setting-object-store-discard="local-draft-reset"');
    expect(html).toContain('data-settings-form-action-help="object-store-apply"');
    expect(html).toContain('data-settings-form-action-help="object-store-discard"');
    expect(html).toContain('data-settings-form-action-help-trigger="hertzbeat-ui-action-help"');
    expect(html).toContain('data-settings-form-action-help-tooltip="object-store-apply"');
    expect(html).toContain('data-settings-form-action-help-tooltip="object-store-discard"');
    expect(html.match(/data-settings-form-field-requirement="required"/g) ?? []).toHaveLength(5);
    expect(html.match(/data-settings-form-field-requirement="optional"/g) ?? []).toHaveLength(1);
    expect(html.match(/data-settings-form-field-input-mode="manual"/g) ?? []).toHaveLength(5);
    expect(html.match(/data-settings-form-field-input-mode="selection"/g) ?? []).toHaveLength(1);
    expect(html).toContain(t('settings.form.field.requirement.required'));
    expect(html).toContain(t('settings.form.field.requirement.optional'));
    expect(html).toContain(t('settings.form.field.input-mode.manual'));
    expect(html).toContain(t('settings.form.field.input-mode.selection'));
    expect(html).toContain(t('settings.object-store'));
    expect(html).toContain('data-settings-form-owner="cold-settings-form-owner"');
    expect(html).toContain('data-settings-form-control="cold-select-control"');
    expect(html).toContain('data-settings-form-control="cold-input-control"');
    expect(html.match(/data-settings-form-field-help="hertzbeat-ui-field-tooltip"/g) ?? []).toHaveLength(6);
    expect(html).toContain(t('settings.object-store.type'));
    expect(html).toContain('AccessKey');
    expect(html).toContain('SecretKey');
    expect(html).toContain('Bucket');
    expect(html).toContain('Endpoint');
    expect(html).toContain(t('settings.object-store.obs.savePath'));
    expect(html).toContain(`placeholder="${t('settings.object-store.obs.accessKey.placeholder')}"`);
    expect(html).toContain(`placeholder="${t('settings.object-store.obs.secretKey.placeholder')}"`);
    expect(html).toContain(`placeholder="${t('settings.object-store.obs.bucketName.placeholder')}"`);
    expect(html).toContain(`placeholder="${t('settings.object-store.obs.endpoint.placeholder')}"`);
    expect(html).toContain(`placeholder="${t('settings.object-store.obs.savePath.placeholder')}"`);
    expect(html).toContain('type="password"');
    expect(html).toContain('data-setting-object-store-secret-input="password"');
    expect(html).toContain(t('settings.object-store.type.help'));
    expect(html).toContain(t('settings.object-store.type.impact'));
    expect(html).toContain(t('settings.object-store.obs.accessKey.help'));
    expect(html).toContain(t('settings.object-store.obs.secretKey.help'));
    expect(html).toContain(t('settings.object-store.obs.bucketName.help'));
    expect(html).toContain(t('settings.object-store.obs.endpoint.help'));
    expect(html).toContain(t('settings.object-store.obs.savePath.help'));
    expect(html).toContain(t('settings.object-store.obs.savePath.impact'));
    expect(html).toContain(t('settings.object-store.action.discard'));
    expect(html).toContain(t('settings.object-store.action.discard.help'));
    expect(html).toContain(t('settings.object-store.action.discard.impact'));
    expect(html).toContain(t('settings.object-store.action.apply.help'));
    expect(html).toContain(t('settings.object-store.action.apply.impact'));
    expect(html).toContain(t('settings.object-store.type.database'));
    expect(html).toContain(t('settings.object-store.type.file'));
    expect(html).toContain(t('settings.object-store.type.obs'));
    expect(html).toContain(t('settings.system-config.ok'));
    expect(html).not.toContain('data-setting-object-store-page="angular-object-store"');
    expect(html).not.toContain('data-setting-object-store-form="angular-vertical-form"');
    expect(html).not.toContain('data-setting-object-store-provider="angular-provider-select"');
    expect(html).not.toContain('data-setting-object-store-obs-fields="angular-obs-fields"');
    expect(html).not.toContain('data-setting-object-store-summary-rail=');
    expect(html).not.toContain('File Server Configuration');
    expect(html).not.toContain('Store Type');
    expect(html).not.toContain('Save</button>');

    await mockState.lastLoad?.();

    expect(apiMessageGet).toHaveBeenCalledWith('/config/oss');
  });

  it('summarizes missing OBS fields before the disabled apply action', async () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    mockState.renderData.config = {
      type: 'OBS',
      config: {
        accessKey: '',
        secretKey: '',
        bucketName: '',
        endpoint: '',
        savePath: ''
      }
    };
    const { default: SettingObjectStorePage } = await import('./page');
    const html = renderToStaticMarkup(<SettingObjectStorePage />);

    expect(html).toContain('data-setting-object-store-validation-summary="missing-required-fields"');
    expect(html).toContain('data-setting-object-store-validation-summary-owner="hertzbeat-ui-inline-feedback"');
    expect(html).toContain('data-setting-object-store-validation-summary-layout="wrapped-description"');
    expect(html).toContain('data-setting-object-store-validation-fields="wrapped-field-list"');
    expect(html).toContain(t('settings.object-store.validation.required-fields-title', { count: '4' }));
    expect(html).toContain('AccessKey, SecretKey, Bucket, Endpoint');
    expect(html).toContain('data-setting-object-store-apply-disabled-reason="invalid"');
  });

  it('blocks unchanged object-store saves and lets exploratory drafts be discarded without writing', async () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    const { default: SettingObjectStorePage } = await import('./page');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<SettingObjectStorePage />);
      await Promise.resolve();
    });

    const form = container.querySelector<HTMLFormElement>('form');
    const unchangedApply = container.querySelector<HTMLButtonElement>('[data-setting-object-store-command-action="apply"]');
    const unchangedDiscard = container.querySelector<HTMLButtonElement>('[data-setting-object-store-command-action="discard"]');
    expect(unchangedApply?.disabled).toBe(true);
    expect(unchangedApply?.getAttribute('data-setting-object-store-apply-dirty')).toBe('unchanged');
    expect(unchangedApply?.getAttribute('data-setting-object-store-apply-disabled-reason')).toBe('unchanged');
    expect(unchangedDiscard?.disabled).toBe(true);
    expect(unchangedDiscard?.getAttribute('data-setting-object-store-discard-dirty')).toBe('unchanged');
    expect(unchangedDiscard?.getAttribute('data-setting-object-store-discard-disabled-reason')).toBe('unchanged');

    await act(async () => {
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(apiMessagePost).not.toHaveBeenCalled();

    const endpointInput = Array.from(container.querySelectorAll<HTMLInputElement>('input')).find(
      input => input.placeholder === t('settings.object-store.obs.endpoint.placeholder')
    );
    expect(endpointInput).not.toBeUndefined();
    await act(async () => {
      setControlledInputValue(endpointInput as HTMLInputElement, 'https://new.obs.example.com');
      await Promise.resolve();
    });

    const changedApply = container.querySelector<HTMLButtonElement>('[data-setting-object-store-command-action="apply"]');
    const changedDiscard = container.querySelector<HTMLButtonElement>('[data-setting-object-store-command-action="discard"]');
    expect(changedApply?.disabled).toBe(false);
    expect(changedApply?.getAttribute('data-setting-object-store-apply-dirty')).toBe('changed');
    expect(changedApply?.getAttribute('data-setting-object-store-apply-disabled-reason')).toBeNull();
    expect(changedDiscard?.disabled).toBe(false);
    expect(changedDiscard?.getAttribute('data-setting-object-store-discard-dirty')).toBe('changed');
    expect(container.querySelector<HTMLInputElement>('input[placeholder]')?.value).toBe('old-ak');
    expect(endpointInput?.value).toBe('https://new.obs.example.com');

    await act(async () => {
      changedDiscard?.click();
      await Promise.resolve();
    });

    const resetEndpointInput = Array.from(container.querySelectorAll<HTMLInputElement>('input')).find(
      input => input.placeholder === t('settings.object-store.obs.endpoint.placeholder')
    );
    expect(resetEndpointInput?.value).toBe('https://old.obs.example.com');
    expect(container.querySelector<HTMLButtonElement>('[data-setting-object-store-command-action="apply"]')?.disabled).toBe(true);
    expect(container.querySelector<HTMLButtonElement>('[data-setting-object-store-command-action="discard"]')?.disabled).toBe(true);
    expect(apiMessagePost).not.toHaveBeenCalled();
  });

  it('keeps the object-store route on the cold settings form owner', () => {
    const source = readFileSync(resolve(__dirname, 'setting-object-store-page.tsx'), 'utf8');

    expect(source).toContain('hzOpsCatalogVisual');
    expect(source).toContain('data-setting-object-store-page="otlp-hertzbeat-ui-object-store"');
    expect(source).toContain('useRef<HTMLDivElement | null>(null)');
    expect(source).toContain('data-setting-object-store-scroll-reset="draft-discard-provider-shrink"');
    expect(source).toContain('data-setting-object-store-style-baseline={coldObjectStoreVisual.canvasName}');
    expect(source).toContain('data-setting-object-store-layout="full-width-settings-form"');
    expect(source).toContain('data-setting-object-store-type-change-contract="angular-reset-config-on-type-change"');
    expect(source).toContain('data-setting-object-store-provider-select-contract="angular-centered-bold-dropdown"');
    expect(source).toContain('data-setting-object-store-form="hertzbeat-ui-settings-form"');
    expect(source).toContain('data-setting-object-store-form-nesting-contract="flat-inside-settings-console-content"');
    expect(source).toContain('className="min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"');
    expect(source).toContain('data-setting-object-store-apply-contract="angular-apply-notify"');
    expect(source).toContain('data-setting-object-store-dirty={isDirty ?');
    expect(source).toContain('data-setting-object-store-provider="hertzbeat-ui-provider-select"');
    expect(source).toContain('data-setting-object-store-provider-select="angular-centered-bold-dropdown"');
    expect(source).toContain('data-setting-object-store-type-change="angular-reset-config-on-type-change"');
    expect(source).toContain('isObjectStoreDraftDirty(draft, data.config || {})');
    expect(source).toContain('function updateProvider(type: string)');
    expect(source).toContain('function updateDraft(nextConfig: ObjectStoreConfig)');
    expect(source).toContain('const nextConfig = updateObjectStoreType(draft || data.config || {}, type)');
    expect(source).toContain('onChange={e => updateProvider(e.target.value)}');
    expect(source).toContain('function discardDraft()');
    expect(source).toContain('const resetFormScroll = useCallback(() =>');
    expect(source).toContain("formAnchorRef.current?.scrollIntoView({ block: 'start' })");
    expect(source).toContain('data-setting-object-store-actions="standard-equal-buttons"');
    expect(source).toContain('data-setting-object-store-command-action="discard"');
    expect(source).toContain('data-setting-object-store-command-action="apply"');
    expect(source).toContain('data-setting-object-store-discard="local-draft-reset"');
    expect(source).toContain('data-setting-object-store-discard-dirty={isDirty ?');
    expect(source).toContain('data-setting-object-store-discard-disabled-reason={!isDirty ?');
    expect(source).toContain('function objectStoreDiscardHelp');
    expect(source).toContain('objectStoreDiscardHelp(t)');
    expect(source).toContain('buildObjectStoreMissingFields(config, t)');
    expect(source).toContain("t('settings.object-store.validation.required-fields-title'");
    expect(source).toContain('data-setting-object-store-validation-summary="missing-required-fields"');
    expect(source).toContain('data-setting-object-store-validation-fields="wrapped-field-list"');
    expect(source).toContain("t('settings.object-store.action.discard')");
    expect(source).toContain("t('settings.object-store.action.discard.help')");
    expect(source).toContain("t('settings.object-store.action.discard.impact')");
    expect(source).toContain('disabled={saving || !isDirty}');
    expect(source).toContain('disabled={saving || !canSave || !isDirty}');
    expect(source).toContain('data-setting-object-store-apply-dirty={isDirty ?');
    expect(source).toContain('data-setting-object-store-apply-disabled-reason=');
    expect(source).toContain('setDraft(null);');
    expect(source).toContain('setMessage(null);');
    expect(source).toContain('setMessageTone(null);');
    expect(source).toContain('onClick={discardDraft}');
    expect(source).toContain('SettingsFormActionHelp');
    expect(source).toContain('function objectStoreApplyHelp');
    expect(source).toContain('function objectStoreRequirement');
    expect(source).toContain('function objectStoreInputMode');
    expect(source).toContain("t(`settings.form.field.requirement.${tone}`)");
    expect(source).toContain("t(`settings.form.field.input-mode.${mode}`)");
    expect(source).toContain("requirement={objectStoreRequirement(t, 'required')}");
    expect(source).toContain("requirement={objectStoreRequirement(t, 'optional')}");
    expect(source).toContain("inputMode={objectStoreInputMode(t, 'selection')}");
    expect(source).toContain("inputMode={objectStoreInputMode(t, 'manual')}");
    expect(source).toContain('id="object-store-apply"');
    expect(source).toContain('objectStoreApplyHelp(t)');
    expect(source).toContain('SettingsConsoleTitle');
    expect(source).toContain('SettingsForm');
    expect(source).toContain('objectStoreFieldHelp');
    expect(source).toContain("t('settings.object-store.field.help-aria'");
    expect(source).toContain('data-setting-object-store-secret-input="password"');
    expect(source).toContain('type="password"');
    expect(source).toContain('autoComplete="new-password"');
    expect(source).toContain("t('common.notify.apply-success')");
    expect(source).toContain("t('common.notify.apply-fail')");
    expect(source).toContain('SettingsFormFeedback');
    expect(source).toContain("tone={messageTone === 'success' ? 'success' : 'error'}");
    expect(source).toContain('data-setting-object-store-apply-feedback-owner="hertzbeat-ui-settings-feedback"');
    expect(source).toContain('data-setting-object-store-apply-feedback="angular-apply-notify"');
    expect(source).not.toContain('angular-object-store');
    expect(source).not.toContain('angular-vertical-form');
    expect(source).not.toContain('angular-provider-select');
    expect(source).not.toContain('angular-obs-fields');
    expect(source).not.toContain('data-setting-object-store-summary-rail');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('@/components/observability');
  });

  it('keeps object-store remounts on a short settled cache window while saves invalidate it', () => {
    const source = readFileSync(resolve(__dirname, 'setting-object-store-page.tsx'), 'utf8');

    expect(source).toContain('SETTING_OBJECT_STORE_SETTLED_CACHE_TTL_MS = 10_000');
    expect(source).toContain("['setting-object-store', '/config/oss', reloadVersion].join(':')");
    expect(source).toContain('void reloadVersion');
    expect(source).toContain('[reloadVersion]');
    expect(source).toContain('setReloadVersion(version => version + 1)');
    expect(source).toContain('cacheKey={settingObjectStoreCacheKey}');
    expect(source).toContain('cacheSettledTtlMs={SETTING_OBJECT_STORE_SETTLED_CACHE_TTL_MS}');
  });
});
