import { describe, expect, it } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { buildIncidentsPlaceholderState, buildIncidentsSurfaceViewModel } from './view-model';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('incidents surface view model', () => {
  it('describes the OTLP cold-matte placeholder shell', () => {
    const state = buildIncidentsPlaceholderState(t);

    expect(state).toMatchObject({
      kicker: t('incidents.entry.kicker'),
      title: t('incidents.entry.title'),
      subtitle: t('incidents.entry.subtitle'),
      shell: {
        eyebrow: t('incidents.entry.shell.eyebrow'),
        chips: [
          t('incidents.entry.chip.entry'),
          t('incidents.entry.chip.timeline'),
          t('incidents.entry.chip.owner-first')
        ]
      },
      empty: {
        title: t('incidents.entry.empty.title')
      }
    });
    expect(state.actions).toEqual([
      { label: t('incidents.entry.action.overview'), href: '/overview', variant: 'primary' },
      { label: t('incidents.entry.action.entities'), href: '/entities', variant: 'subtle' }
    ]);
    expect(state.checklist.map(item => item.title)).toEqual([
      t('incidents.entry.checklist.context.title'),
      t('incidents.entry.checklist.adapter.title'),
      t('incidents.entry.checklist.evidence.title')
    ]);
  });

  it('derives incident cards, response timeline, and ownership lanes', () => {
    const viewModel = buildIncidentsSurfaceViewModel(t);

    expect(viewModel.kicker).toBe(t('incidents.surface.kicker'));
    expect(viewModel.tags).toEqual([
      t('incidents.tag.shell'),
      t('incidents.tag.timeline'),
      t('incidents.tag.owner-first')
    ]);
    expect(viewModel.facts.find(fact => fact.label === t('ops.surface.fact.signals-label'))?.value).toBe('3');
    expect(viewModel.metrics).toEqual([
      { label: t('incidents.metric.open'), value: '3' },
      { label: t('incidents.metric.critical'), value: '1' },
      { label: t('incidents.metric.mitigating'), value: '1' },
      { label: t('incidents.metric.ownership-queues'), value: '3' }
    ]);
    expect(viewModel.incidentCards).toHaveLength(3);
    expect(viewModel.incidentCards[0]).toMatchObject({
      title: t('incidents.row.checkout.title'),
      copy: `${t('incidents.row.checkout.service')} · ${t('incidents.row.checkout.owner')}`,
      eyebrow: `critical · ${t('incidents.row.checkout.blast-radius')}`
    });
    expect(viewModel.timelineRows[0]).toMatchObject({
      title: t('incidents.timeline.checkout.title'),
      copy: t('incidents.timeline.checkout.copy'),
      meta: t('incidents.timeline.checkout.meta')
    });
    expect(viewModel.ownershipRows[0]).toMatchObject({
      title: `${t('incidents.ownership.checkout.owner')} · ${t('incidents.ownership.checkout.queue')}`,
      copy: t('incidents.ownership.checkout.copy'),
      meta: t('incidents.ownership.checkout.meta')
    });
    expect(viewModel.checklist.map(item => item.meta)).toEqual([
      t('incidents.checklist.shell.meta'),
      t('incidents.checklist.adapter.meta'),
      t('incidents.checklist.drilldown.meta')
    ]);
    expect(viewModel.nextHops[0]).toEqual({
      label: t('setting.status.title'),
      href: '/setting/status?tab=incident',
      variant: 'primary'
    });
    expect(viewModel.handoffRows).toHaveLength(3);
  });
});
