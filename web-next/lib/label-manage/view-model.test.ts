import { describe, expect, it, vi } from 'vitest';
import { buildLabelCards, buildLabelDisplayName, buildLabelFacts, buildLabelMetrics, buildLabelRows, renderAngularLabelColor } from './view-model';
import { createTranslatorMock } from '../../test/i18n-test-helper';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('label view model', () => {
  it('builds label facts', () => {
    expect(buildLabelFacts({ totalElements: 8, content: [1, 2, 3] } as any, t)).toEqual([
      { label: '工作区', value: 'setting/labels' },
      { label: '总量', value: '8' },
      { label: '当前页', value: '3' }
    ]);
  });

  it('builds metrics', () => {
    expect(buildLabelMetrics([{ type: 0 }, { type: 1 }, { type: 2 }, { type: 1 }] as any, t)).toEqual([
      { label: '自动标签/当前页', value: '1' },
      { label: '用户标签/当前页', value: '2', tone: 'success' },
      { label: '预置标签/当前页', value: '1', tone: 'warning' }
    ]);
  });

  it('builds label cards for the settings card grid', () => {
    expect(
      buildLabelCards(
        [
          { id: 1, name: 'team', tagValue: 'ops', description: 'ops team', type: 1, gmtUpdate: 1712730000000 }
        ] as any,
        () => 'user',
        () => '2026-04-10 18:00:00'
      )
    ).toEqual([
      {
        key: '1',
        displayName: 'team:ops',
        description: 'ops team',
        meta: 'user · 2026-04-10 18:00:00',
        href: '/monitors?labels=team%3Aops'
      }
    ]);
  });

  it('builds label rows', () => {
    expect(
      buildLabelRows(
        [
          { name: 'team', tagValue: 'ops', description: 'ops team', type: 1, gmtUpdate: 1712730000000 }
        ] as any,
        () => 'user',
        () => '2026-04-10 18:00:00'
      )
    ).toEqual([
      { title: 'team:ops', copy: 'ops team', meta: 'user · 2026-04-10 18:00:00' }
    ]);
  });

  it('builds label display names', () => {
    expect(buildLabelDisplayName({ name: 'team', tagValue: 'ops' } as any)).toBe('team:ops');
    expect(buildLabelDisplayName({ name: 'team', tagValue: ' ops ' } as any)).toBe('team: ops ');
    expect(buildLabelDisplayName({ name: 'source', tagValue: '' } as any)).toBe('source');
    expect(buildLabelDisplayName({ name: 'source', tagValue: '   ' } as any)).toBe('source');
  });

  it('keeps the old Angular stable label color hashing', () => {
    expect(renderAngularLabelColor('team')).toBe('geekblue');
    expect(renderAngularLabelColor('source')).toBe('green');
    expect(renderAngularLabelColor('env')).toBe('yellow');
  });
});
