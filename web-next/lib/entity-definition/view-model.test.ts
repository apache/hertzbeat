import { describe, expect, it, vi } from 'vitest';
import { buildDefinitionActivityRows, buildDefinitionFacts, buildTemplateReferenceRows } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({
  locale: 'zh-CN'
});

describe('entity definition view model', () => {
  it('builds facts from entityId, format, activities and templates', () => {
    expect(buildDefinitionFacts('42', 'yaml', 3, 2, t)).toEqual([
      { label: t('entities.definition.workspace.fact.workspace'), value: 'entities/42/definition' },
      { label: t('entities.definition.workspace.fact.format'), value: 'yaml' },
      { label: t('entities.definition.workspace.fact.activities'), value: '3' },
      { label: t('entities.definition.workspace.fact.templates'), value: '2' }
    ]);
  });

  it('builds activity rows', () => {
    expect(
      buildDefinitionActivityRows(
        [{ summary: 'updated definition', detail: 'saved from editor', activityType: 'update', status: 'success', format: 'yaml' }] as any
      )
    ).toEqual([
      { title: 'updated definition', copy: 'saved from editor', meta: 'success · yaml' }
    ]);
  });

  it('builds template reference rows', () => {
    expect(
      buildTemplateReferenceRows(
        [{ id: 2, name: 'base-template', summary: 'shared service template', format: 'yaml', source: 'workspace' }] as any
      )
    ).toEqual([
      {
        key: '2',
        title: 'base-template',
        copy: 'shared service template',
        meta: 'yaml · workspace'
      }
    ]);
  });
});
