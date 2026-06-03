import { describe, expect, it } from 'vitest';
import { buildTemplateFacts, buildTemplateMenuView, buildTemplateSummaryRows } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import type { SettingDefinePageData } from './controller';

const t = createTranslatorMock({ locale: 'zh-CN' });

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
      { label: t('common.workspace'), value: 'setting/define' },
      { label: t('common.total'), value: '2' },
      { label: t('setting.define.fact.selected-template'), value: 'MySQL' },
      { label: t('setting.define.fact.hidden'), value: '1' }
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
            meta: t('setting.define.template.visible'),
            app: 'mysql',
            hidden: false
          }
        ]
      },
      {
        key: 'os',
        label: t('menu.monitor.os'),
        rows: [
          {
            key: 'linux',
            title: 'Linux',
            copy: 'os · linux',
            meta: t('setting.define.template.hidden'),
            app: 'linux',
            hidden: true
          }
        ]
      }
    ]);
  });

  it('renders monitor-template category headers through old Angular menu.monitor translations', () => {
    const translatedCategoryT = createTranslatorMock({ locale: 'zh-CN' });

    expect(
      buildTemplateMenuView(
        [
          {
            key: 'db',
            label: 'DB',
            items: [{ category: 'db', value: 'mysql', label: 'Mysql Database', hide: false }]
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
    ).toEqual([translatedCategoryT('menu.monitor.db'), 'EDGE_DEVICE']);
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
      { title: 'MySQL', copy: 'app-mysql.yml', meta: t('setting.define.summary.mode.edit') },
      { title: 'YAML', copy: t('setting.define.summary.yaml-lines', { count: 2 }), meta: 'setting/define' }
    ]);

    expect(buildTemplateSummaryRows(null, 'app: custom', t)).toEqual([
      { title: t('setting.define.new-template'), copy: 'app-custom.yml', meta: t('setting.define.summary.mode.new') },
      { title: 'YAML', copy: t('setting.define.summary.yaml-lines', { count: 1 }), meta: 'setting/define' }
    ]);
  });
});
