import { describe, expect, it, vi } from 'vitest';
import { SUPPLEMENTAL_MESSAGES } from '../i18n-runtime-messages';
import {
  buildTemplateMenuGroups,
  buildNewTemplateDraft,
  buildNewTemplateYaml,
  deleteTemplateDefine,
  loadDefineCenterData,
  readTemplateAppFromYaml,
  reloadTemplateDefinitionStartupContext,
  saveTemplateDefine,
  updateTemplateVisibility
} from './controller';

describe('setting define controller', () => {
  it('loads the old monitor-template hierarchy and selected app YML instead of alert definitions', async () => {
    const apiMessageGet = vi
      .fn()
      .mockResolvedValueOnce([
        { category: 'database', value: 'mysql', label: 'MySQL', hide: false },
        { category: 'cloud', value: 'prometheus', label: 'Prometheus', hide: true },
        { category: '__system__', value: 'internal', label: 'Internal', hide: true },
        { category: 'os', value: 'linux', label: 'Linux', hide: true }
      ])
      .mockResolvedValueOnce('app: mysql\ncategory: database\nparams:\n  - field: host');

    const result = await loadDefineCenterData(apiMessageGet as any, 'mysql', 'zh-CN');

    expect(apiMessageGet).toHaveBeenNthCalledWith(1, '/apps/hierarchy?lang=zh-CN');
    expect(apiMessageGet).toHaveBeenNthCalledWith(2, '/apps/mysql/define/yml');
    expect(apiMessageGet).not.toHaveBeenCalledWith(expect.stringContaining('/alert/'));
    expect(result.selectedApp).toBe('mysql');
    expect(result.yaml).toContain('app: mysql');
    expect(result.originalYaml).toBe(result.yaml);
    expect(result.appLabels).toEqual({ linux: 'Linux', mysql: 'MySQL' });
    expect(result.menuGroups).toEqual([
      {
        key: 'database',
        label: 'DATABASE',
        items: [{ category: 'database', value: 'mysql', label: 'MySQL', hide: false }]
      },
      {
        key: 'os',
        label: 'OS',
        items: [{ category: 'os', value: 'linux', label: 'Linux', hide: true }]
      }
    ]);
  });

  it('preserves the old Angular backend hierarchy order for menu categories and rows', () => {
    expect(
      buildTemplateMenuGroups([
        { category: 'os', value: 'linux', label: 'Linux', hide: false },
        { category: 'os', value: 'freebsd', label: 'FreeBSD' },
        { category: 'database', value: 'mysql', label: 'MySQL', hide: false },
        { category: 'os', value: 'zookeeper', label: 'ZooKeeper', hide: false },
        { category: 'cloud', value: 'prometheus', label: 'Prometheus', hide: true },
        { category: '__system__', value: 'internal', label: 'Internal', hide: true },
        { category: 'database', value: 'postgresql', label: 'PostgreSQL', hide: true }
      ])
    ).toEqual([
      {
        key: 'os',
        label: 'OS',
        items: [
          { category: 'os', value: 'linux', label: 'Linux', hide: false },
          { category: 'os', value: 'freebsd', label: 'FreeBSD', hide: true },
          { category: 'os', value: 'zookeeper', label: 'ZooKeeper', hide: false }
        ]
      },
      {
        key: 'database',
        label: 'DATABASE',
        items: [
          { category: 'database', value: 'mysql', label: 'MySQL', hide: false },
          { category: 'database', value: 'postgresql', label: 'PostgreSQL', hide: true }
        ]
      }
    ]);
  });

  it('keeps the new-template editor local when no app query is selected', async () => {
    const apiMessageGet = vi.fn().mockResolvedValueOnce([{ category: 'database', value: 'mysql', label: 'MySQL', hide: false }]);
    const oldAngularDraft = buildNewTemplateDraft('en-US');
    const expectedDraftComment = SUPPLEMENTAL_MESSAGES['en-US']?.['setting.define.new-template.comment'];

    const result = await loadDefineCenterData(apiMessageGet as any, undefined, 'en-US');

    expect(apiMessageGet).toHaveBeenCalledTimes(1);
    expect(apiMessageGet).toHaveBeenCalledWith('/apps/hierarchy?lang=en-US');
    expect(result.selectedApp).toBeNull();
    expect(oldAngularDraft.yaml).toBe(`${expectedDraftComment}\n\n\n\n\n`);
    expect(oldAngularDraft.originalYaml).toBe(expectedDraftComment);
    expect(oldAngularDraft.yaml).toBe(buildNewTemplateYaml('en-US'));
    expect(result.yaml).toBe(oldAngularDraft.yaml);
    expect(result.originalYaml).toBe(oldAngularDraft.originalYaml);
    expect(result.yaml).not.toBe(result.originalYaml);
    expect(result.yaml).not.toContain('app: custom');
    expect(result.yaml).not.toContain('metrics:');
  });

  it('loads localized new-template comments from the runtime catalog', () => {
    const zhCatalogComment = SUPPLEMENTAL_MESSAGES['zh-CN']?.['setting.define.new-template.comment'];
    const zhDraft = buildNewTemplateDraft('zh-CN');

    expect(zhDraft.originalYaml).toBe(zhCatalogComment);
    expect(zhDraft.yaml).toBe(`${zhCatalogComment}\n\n\n\n\n`);
    expect(buildNewTemplateDraft('ja-JP').originalYaml).toBe(
      SUPPLEMENTAL_MESSAGES['en-US']?.['setting.define.new-template.comment']
    );
  });

  it('writes monitor-template YML through the old save, delete, and hide endpoints', async () => {
    const apiMessagePost = vi.fn().mockResolvedValue(undefined);
    const apiMessagePut = vi.fn().mockResolvedValue(undefined);
    const apiMessageDelete = vi.fn().mockResolvedValue(undefined);

    await saveTemplateDefine(apiMessagePost as any, apiMessagePut as any, 'app: custom', true);
    await saveTemplateDefine(apiMessagePost as any, apiMessagePut as any, 'app: mysql', false);
    await deleteTemplateDefine(apiMessageDelete as any, 'mysql');
    await updateTemplateVisibility(apiMessagePut as any, 'mysql', true);

    expect(apiMessagePost).toHaveBeenCalledWith('/apps/define/yml', { define: 'app: custom' });
    expect(apiMessagePut).toHaveBeenNthCalledWith(1, '/apps/define/yml', { define: 'app: mysql' });
    expect(apiMessageDelete).toHaveBeenCalledWith('/apps/mysql/define/yml');
    expect(apiMessagePut).toHaveBeenNthCalledWith(2, '/config/template/mysql', { hide: true });
  });

  it('reads the saved app id from monitor-template YAML', () => {
    expect(readTemplateAppFromYaml('category: custom\napp: codex_pd_1346\nname: test')).toBe('codex_pd_1346');
    expect(readTemplateAppFromYaml('app: "quoted-template"\ncategory: custom')).toBe('quoted-template');
    expect(readTemplateAppFromYaml('category: custom')).toBeNull();
  });

  it('reloads the old startup config resource context after YML mutations', async () => {
    const apiMessageGet = vi
      .fn()
      .mockResolvedValueOnce({ locale: 'en_US' })
      .mockResolvedValueOnce([{ category: 'database', value: 'mysql', label: 'MySQL', hide: false }]);

    await reloadTemplateDefinitionStartupContext(apiMessageGet as any, 'zh-CN');

    expect(apiMessageGet).toHaveBeenNthCalledWith(1, '/config/system');
    expect(apiMessageGet).toHaveBeenNthCalledWith(2, '/apps/hierarchy?lang=en-US');
  });
});
