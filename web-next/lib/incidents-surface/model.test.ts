import { describe, expect, it } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { buildIncidentsDomainModel } from './model';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('incidents domain model', () => {
  it('builds an incident-centered workspace snapshot', () => {
    const model = buildIncidentsDomainModel(t);

    expect(model.title).toBe(t('incidents.entry.title'));
    expect(model.tags).toEqual([
      t('incidents.tag.shell'),
      t('incidents.tag.timeline'),
      t('incidents.tag.owner-first')
    ]);
    expect(model.incidents).toHaveLength(3);
    expect(model.incidents[0]?.severity).toBe('critical');
    expect(model.incidents[0]).toMatchObject({
      title: t('incidents.row.checkout.title'),
      service: t('incidents.row.checkout.service'),
      owner: t('incidents.row.checkout.owner'),
      blastRadius: t('incidents.row.checkout.blast-radius')
    });
    expect(model.timeline).toHaveLength(3);
    expect(model.timeline[0]).toEqual({
      title: t('incidents.timeline.checkout.title'),
      copy: t('incidents.timeline.checkout.copy'),
      meta: t('incidents.timeline.checkout.meta')
    });
    expect(model.ownership[0]).toEqual({
      owner: t('incidents.ownership.checkout.owner'),
      queue: t('incidents.ownership.checkout.queue'),
      copy: t('incidents.ownership.checkout.copy'),
      meta: t('incidents.ownership.checkout.meta')
    });
    expect(model.metrics).toEqual([
      { label: t('incidents.metric.open'), value: '3' },
      { label: t('incidents.metric.critical'), value: '1' },
      { label: t('incidents.metric.mitigating'), value: '1' },
      { label: t('incidents.metric.ownership-queues'), value: '3' }
    ]);
    expect(model.checklist.map(item => item.meta)).toEqual([
      t('incidents.checklist.shell.meta'),
      t('incidents.checklist.adapter.meta'),
      t('incidents.checklist.drilldown.meta')
    ]);
  });
});
