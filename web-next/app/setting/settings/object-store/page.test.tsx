import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../../../test/i18n-test-helper';

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
  SettingsFormField: ({ label, children }: any) => (
    <label data-settings-form-field="cold-form-field" data-settings-form-label={label}>
      <span>{label}</span>
      {children}
    </label>
  ),
  SettingsFormInput: (props: any) => <input data-settings-form-control="cold-input-control" {...props} />,
  SettingsFormSelect: ({ children, ...props }: any) => <select data-settings-form-control="cold-select-control" {...props}>{children}</select>,
  SettingsFormActions: ({ children, ...props }: any) => <div {...props}>{children}</div>
}));

vi.mock('@hertzbeat/ui', () => ({
  HzInlineFeedback: ({ title, ...props }: any) => (
    <div data-hz-ui="inline-feedback" {...props}>
      {title}
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
  beforeEach(() => {
    mockState.lastLoad = null;
    apiMessageGet.mockReset().mockResolvedValue(mockState.renderData.config);
    apiMessagePost.mockReset();
  });

  it('renders the cold object store form on the shared settings console contract', async () => {
    const t = createTranslatorMock({ locale: 'zh-CN' });
    const { default: SettingObjectStorePage } = await import('./page');
    const html = renderToStaticMarkup(<SettingObjectStorePage />);

    expect(html).toContain('data-client-workbench="true"');
    expect(html).toContain('data-settings-console-title="true"');
    expect(html).toContain('data-setting-object-store-page="otlp-hertzbeat-ui-object-store"');
    expect(html).toContain('data-setting-object-store-style-baseline="hertzbeat-ui-matte"');
    expect(html).toContain('data-setting-object-store-layout="full-width-settings-form"');
    expect(html).toContain('data-setting-object-store-type-change-contract="angular-reset-config-on-type-change"');
    expect(html).toContain('data-setting-object-store-provider-select-contract="angular-centered-bold-dropdown"');
    expect(html).toContain('data-setting-object-store-form="hertzbeat-ui-settings-form"');
    expect(html).toContain('data-setting-object-store-apply-contract="angular-apply-notify"');
    expect(html).toContain('data-setting-object-store-provider="hertzbeat-ui-provider-select"');
    expect(html).toContain('data-setting-object-store-provider-select="angular-centered-bold-dropdown"');
    expect(html).toContain('data-setting-object-store-type-change="angular-reset-config-on-type-change"');
    expect(html).toContain('data-setting-object-store-obs-fields="hertzbeat-ui-obs-fields"');
    expect(html).toContain('data-setting-object-store-actions="standard-equal-buttons"');
    expect(html).toContain(t('settings.object-store'));
    expect(html).toContain('data-settings-form-owner="cold-settings-form-owner"');
    expect(html).toContain('data-settings-form-control="cold-select-control"');
    expect(html).toContain('data-settings-form-control="cold-input-control"');
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

  it('keeps the object-store route on the cold settings form owner', () => {
    const source = readFileSync(resolve(__dirname, 'setting-object-store-page.tsx'), 'utf8');

    expect(source).toContain('hzOpsCatalogVisual');
    expect(source).toContain('data-setting-object-store-page="otlp-hertzbeat-ui-object-store"');
    expect(source).toContain('data-setting-object-store-style-baseline={coldObjectStoreVisual.canvasName}');
    expect(source).toContain('data-setting-object-store-layout="full-width-settings-form"');
    expect(source).toContain('data-setting-object-store-type-change-contract="angular-reset-config-on-type-change"');
    expect(source).toContain('data-setting-object-store-provider-select-contract="angular-centered-bold-dropdown"');
    expect(source).toContain('data-setting-object-store-form="hertzbeat-ui-settings-form"');
    expect(source).toContain('data-setting-object-store-apply-contract="angular-apply-notify"');
    expect(source).toContain('data-setting-object-store-provider="hertzbeat-ui-provider-select"');
    expect(source).toContain('data-setting-object-store-provider-select="angular-centered-bold-dropdown"');
    expect(source).toContain('data-setting-object-store-type-change="angular-reset-config-on-type-change"');
    expect(source).toContain('updateObjectStoreType(prev || data.config || {}, e.target.value)');
    expect(source).toContain('data-setting-object-store-actions="standard-equal-buttons"');
    expect(source).toContain('SettingsConsoleTitle');
    expect(source).toContain('SettingsForm');
    expect(source).toContain("t('common.notify.apply-success')");
    expect(source).toContain("t('common.notify.apply-fail')");
    expect(source).toContain('data-setting-object-store-apply-feedback-owner="hertzbeat-ui-inline-feedback"');
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
