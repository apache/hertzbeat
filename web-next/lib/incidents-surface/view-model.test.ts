import { describe, expect, it } from 'vitest';
import { buildIncidentsPlaceholderState, buildIncidentsSurfaceViewModel } from './view-model';

const t = (key: string) => {
  const messages: Record<string, string> = {
    'incidents.subtitle': 'Response timeline, ownership, and next steps stay grouped in a single operator context.',
    'incidents.focus': 'Incident posture and response handoff',
    'incidents.summary': 'The incidents entry page keeps response state, owners, and related evidence aligned while the deeper domain is still landing.',
    'incidents.checklist.shell.title': 'Shell ready',
    'incidents.checklist.shell.copy': 'The incidents route already shares the workbench shell and routing posture.',
    'incidents.checklist.adapter.title': 'Adapters next',
    'incidents.checklist.adapter.copy': 'Incident list, owner state, and response timeline can plug into the current API boundary.',
    'incidents.checklist.drilldown.title': 'Drilldown reserved',
    'incidents.checklist.drilldown.copy': 'Log, trace, and entity handoff stay on the planned expansion path.',
    'common.workspace': 'Workspace',
    'common.focus': 'Focus',
    'common.mode': 'Mode',
    'common.signals': 'Signals',
    'ops.surface.mode.entry': 'entry surface',
    'menu.dashboard.back': 'Open overview',
    'menu.log.manage': 'Log manage',
    'menu.trace.manage': 'Trace manage'
  };
  return messages[key] ?? key;
};

describe('incidents surface view model', () => {
  it('describes the OTLP cold-matte placeholder shell', () => {
    const state = buildIncidentsPlaceholderState();

    expect(state).toMatchObject({
      kicker: '事件入口',
      title: '故障事件',
      subtitle: '按 OTLP 工作台的冷色基线统一响应时间线、责任人和证据入口。',
      shell: {
        eyebrow: '冷色入口已接入',
        chips: ['事件入口', '响应时间线', '责任人优先']
      },
      empty: {
        title: '等待接入事件适配器'
      }
    });
    expect(state.actions).toEqual([
      { label: '打开概览', href: '/overview', variant: 'primary' },
      { label: '查看对象', href: '/entities', variant: 'subtle' }
    ]);
    expect(state.checklist.map(item => item.title)).toEqual([
      '统一入口上下文',
      '接入事件适配器',
      '保留证据跳转'
    ]);
  });

  it('derives incident cards, response timeline, and ownership lanes', () => {
    const viewModel = buildIncidentsSurfaceViewModel(t);

    expect(viewModel.kicker).toBe('Incident response desk');
    expect(viewModel.incidentCards).toHaveLength(3);
    expect(viewModel.incidentCards[0]).toMatchObject({
      title: 'Checkout latency spike across prod-ap'
    });
    expect(viewModel.timelineRows[0]?.meta).toContain('checkout latency incident');
    expect(viewModel.ownershipRows[0]?.title).toContain('checkout-oncall');
    expect(viewModel.handoffRows).toHaveLength(3);
  });
});
