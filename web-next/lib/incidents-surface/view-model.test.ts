import { describe, expect, it } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { buildIncidentsPlaceholderState, buildIncidentsSurfaceViewModel } from './view-model';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('incidents surface view model', () => {
  it('describes the OTLP cold-matte placeholder shell', () => {
    const state = buildIncidentsPlaceholderState(t);

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

    expect(viewModel.kicker).toBe('事件响应台');
    expect(viewModel.tags).toEqual(['事件入口外壳', '响应时间线', '责任人优先']);
    expect(viewModel.facts.find(fact => fact.label === '信号')?.value).toBe('3');
    expect(viewModel.metrics).toEqual([
      { label: '打开事件', value: '3' },
      { label: '严重事件', value: '1' },
      { label: '缓解中', value: '1' },
      { label: '责任队列', value: '3' }
    ]);
    expect(viewModel.incidentCards).toHaveLength(3);
    expect(viewModel.incidentCards[0]).toMatchObject({
      title: 'checkout 在 prod-ap 出现延迟突增',
      copy: 'checkout · checkout-oncall',
      eyebrow: 'critical · 2 个区域'
    });
    expect(viewModel.timelineRows[0]).toMatchObject({
      title: '09:08 开始缓解',
      copy: '回滚和重启动作已从告警证据包打开。',
      meta: 'checkout 延迟事件'
    });
    expect(viewModel.ownershipRows[0]).toMatchObject({
      title: 'checkout-oncall · 主响应人',
      copy: '保持告警、链路和发布上下文绑定到当前缓解线程。',
      meta: '2 个活跃交接'
    });
    expect(viewModel.checklist.map(item => item.meta)).toEqual(['已完成', '下一步', '预留']);
    expect(viewModel.handoffRows).toHaveLength(3);
  });
});
