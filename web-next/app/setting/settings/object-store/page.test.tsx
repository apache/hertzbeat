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
      locale: 'zh-CN',
      overrides: {
        'settings.object-store': '文件服务配置',
        'settings.object-store.type': '文件服务提供商',
        'settings.object-store.obs.accessKey': 'AccessKey',
        'settings.object-store.obs.secretKey': 'SecretKey',
        'settings.object-store.obs.bucketName': 'Bucket',
        'settings.object-store.obs.endpoint': 'EndPoint',
        'settings.object-store.obs.savePath': '保存路径',
        'settings.object-store.obs.accessKey.placeholder': '华为云的AccessKeyId',
        'settings.object-store.obs.secretKey.placeholder': '华为云的AccessKeySecret',
        'settings.object-store.obs.bucketName.placeholder': '华为云OBS中您创建的Bucket名称',
        'settings.object-store.obs.endpoint.placeholder': '华为云OBS地域域名，不包括Bucket名',
        'settings.object-store.obs.savePath.placeholder': '备份文件保存路径, 默认是hertzbeat',
        'settings.object-store.type.database': '本地数据库（默认）',
        'settings.object-store.type.file': '本地文件',
        'settings.object-store.type.obs': '华为云OBS',
        'settings.system-config.ok': '确认更新'
      }
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
  SettingsFormActions: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SettingsFormFeedback: ({ children }: any) => <div data-settings-form-feedback="true">{children}</div>
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
    const { default: SettingObjectStorePage } = await import('./page');
    const html = renderToStaticMarkup(<SettingObjectStorePage />);

    expect(html).toContain('data-client-workbench="true"');
    expect(html).toContain('data-settings-console-title="true"');
    expect(html).toContain('data-setting-object-store-page="otlp-cold-object-store"');
    expect(html).toContain('data-setting-object-store-style-baseline="hertzbeat-cold-matte"');
    expect(html).toContain('data-setting-object-store-layout="full-width-settings-form"');
    expect(html).toContain('data-setting-object-store-form="cold-settings-form"');
    expect(html).toContain('data-setting-object-store-provider="cold-provider-select"');
    expect(html).toContain('data-setting-object-store-obs-fields="cold-obs-fields"');
    expect(html).toContain('data-setting-object-store-actions="standard-equal-buttons"');
    expect(html).toContain('文件服务配置');
    expect(html).toContain('data-settings-form-owner="cold-settings-form-owner"');
    expect(html).toContain('data-settings-form-control="cold-select-control"');
    expect(html).toContain('data-settings-form-control="cold-input-control"');
    expect(html).toContain('文件服务提供商');
    expect(html).toContain('AccessKey');
    expect(html).toContain('SecretKey');
    expect(html).toContain('Bucket');
    expect(html).toContain('EndPoint');
    expect(html).toContain('保存路径');
    expect(html).toContain('本地数据库（默认）');
    expect(html).toContain('本地文件');
    expect(html).toContain('华为云OBS');
    expect(html).toContain('确认更新');
    expect(html).not.toContain('data-setting-object-store-page="angular-object-store"');
    expect(html).not.toContain('data-setting-object-store-form="angular-vertical-form"');
    expect(html).not.toContain('data-setting-object-store-provider="angular-provider-select"');
    expect(html).not.toContain('data-setting-object-store-obs-fields="angular-obs-fields"');
    expect(html).not.toContain('data-setting-object-store-summary-rail=');
    expect(html).not.toContain('文件服务摘要');
    expect(html).not.toContain('当前文件服务');
    expect(html).not.toContain('File Server Configuration');
    expect(html).not.toContain('Store Type');
    expect(html).not.toContain('Save</button>');

    await mockState.lastLoad?.();

    expect(apiMessageGet).toHaveBeenCalledWith('/config/oss');
  });

  it('keeps the object-store route on the cold settings form owner', () => {
    const source = readFileSync(resolve(__dirname, 'page.tsx'), 'utf8');

    expect(source).toContain('coldOpsCatalogVisual');
    expect(source).toContain('data-setting-object-store-page="otlp-cold-object-store"');
    expect(source).toContain('data-setting-object-store-style-baseline={coldObjectStoreVisual.canvasName}');
    expect(source).toContain('data-setting-object-store-layout="full-width-settings-form"');
    expect(source).toContain('data-setting-object-store-form="cold-settings-form"');
    expect(source).toContain('data-setting-object-store-provider="cold-provider-select"');
    expect(source).toContain('data-setting-object-store-actions="standard-equal-buttons"');
    expect(source).toContain('SettingsConsoleTitle');
    expect(source).toContain('SettingsForm');
    expect(source).not.toContain('angular-object-store');
    expect(source).not.toContain('angular-vertical-form');
    expect(source).not.toContain('angular-provider-select');
    expect(source).not.toContain('angular-obs-fields');
    expect(source).not.toContain('data-setting-object-store-summary-rail');
    expect(source).not.toContain('WorkbenchPage');
    expect(source).not.toContain('@/components/observability');
  });
});
