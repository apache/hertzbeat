import { describe, expect, it } from 'vitest';
import { buildTemplateFacts, buildTemplateMenuView, buildTemplateSummaryRows } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import type { SettingDefinePageData } from './controller';

const t = createTranslatorMock({
  locale: 'zh-CN',
  overrides: {
    'setting.define.fact.selected-template': '当前模板',
    'setting.define.fact.hidden': '隐藏模板',
    'setting.define.new-template': '新增模板草稿',
    'setting.define.template.visible': '可见',
    'setting.define.template.hidden': '隐藏',
    'setting.define.summary.yaml-lines': '{{count}} 行 YAML',
    'setting.define.summary.mode.new': '新增',
    'setting.define.summary.mode.edit': '编辑'
  }
});

const data: SettingDefinePageData = {
  selectedApp: 'mysql',
  yaml: 'app: mysql\ncategory: database\nparams:\n  - field: host',
  originalYaml: 'app: mysql\ncategory: database\nparams:\n  - field: host',
  appLabels: {
    mysql: 'MySQL',
    linux: 'Linux'
  },
  menuGroups: [
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
  ]
};

describe('setting define monitor-template view model', () => {
  it('builds facts from template YML workspace data', () => {
    expect(buildTemplateFacts(data, t)).toEqual([
      { label: '工作区', value: 'setting/define' },
      { label: '总量', value: '2' },
      { label: '当前模板', value: 'MySQL' },
      { label: '隐藏模板', value: '1' }
    ]);
  });

  it('builds grouped menu rows with visible and hidden template state', () => {
    expect(buildTemplateMenuView(data.menuGroups, '', t)).toEqual([
      {
        key: 'database',
        label: 'DATABASE',
        rows: [
          {
            key: 'mysql',
            title: 'MySQL',
            copy: 'database · mysql',
            meta: '可见',
            app: 'mysql',
            hidden: false
          }
        ]
      },
      {
        key: 'os',
        label: '操作系统监控',
        rows: [
          {
            key: 'linux',
            title: 'Linux',
            copy: 'os · linux',
            meta: '隐藏',
            app: 'linux',
            hidden: true
          }
        ]
      }
    ]);
  });

  it('renders monitor-template category headers through old Angular menu.monitor translations', () => {
    const translatedCategoryT = createTranslatorMock({
      locale: 'zh-CN',
      overrides: {
        'menu.monitor.db': '数据库监控',
        'setting.define.template.visible': '可见'
      }
    });

    expect(
      buildTemplateMenuView(
        [
          {
            key: 'db',
            label: 'DB',
            items: [{ category: 'db', value: 'mysql', label: 'Mysql数据库', hide: false }]
          },
          {
            key: 'edge_device',
            label: 'EDGE_DEVICE',
            items: [{ category: 'edge_device', value: 'edge_box', label: 'Edge Box', hide: false }]
          }
        ],
        '',
        translatedCategoryT
      ).map(group => group.label)
    ).toEqual(['数据库监控', 'EDGE_DEVICE']);
  });

  it('filters menu rows by visible template label like old Angular monitor-select-list', () => {
    expect(buildTemplateMenuView(data.menuGroups, 'lin', t).map(group => group.key)).toEqual(['os']);
    expect(buildTemplateMenuView(data.menuGroups, 'database', t).map(group => group.key)).toEqual([]);

    expect(
      buildTemplateMenuView(
        [
          {
            key: 'database',
            label: 'DATABASE',
            items: [{ category: 'database', value: 'postgresql', label: 'Postgres DB', hide: false }]
          }
        ],
        'postgresql',
        t
      )
    ).toEqual([]);
    expect(
      buildTemplateMenuView(
        [
          {
            key: 'database',
            label: 'DATABASE',
            items: [{ category: 'database', value: 'postgresql', label: 'Postgres DB', hide: false }]
          }
        ],
        'postgres',
        t
      ).map(group => group.key)
    ).toEqual(['database']);
  });

  it('builds compact editor summary rows for existing and new templates', () => {
    expect(buildTemplateSummaryRows('mysql', 'app: mysql\ncategory: database', t, 'MySQL')).toEqual([
      { title: 'MySQL', copy: 'app-mysql.yml', meta: '编辑' },
      { title: 'YAML', copy: '2 行 YAML', meta: 'setting/define' }
    ]);

    expect(buildTemplateSummaryRows(null, 'app: custom', t)).toEqual([
      { title: '新增模板草稿', copy: 'app-custom.yml', meta: '新增' },
      { title: 'YAML', copy: '1 行 YAML', meta: 'setting/define' }
    ]);
  });
});
