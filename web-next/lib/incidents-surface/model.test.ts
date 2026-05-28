import { describe, expect, it } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { buildIncidentsDomainModel } from './model';

const t = createTranslatorMock({ locale: 'zh-CN' });

describe('incidents domain model', () => {
  it('builds an incident-centered workspace snapshot', () => {
    const model = buildIncidentsDomainModel(t);

    expect(model.title).toBe('故障事件');
    expect(model.tags).toEqual(['事件入口外壳', '响应时间线', '责任人优先']);
    expect(model.incidents).toHaveLength(3);
    expect(model.incidents[0]?.severity).toBe('critical');
    expect(model.incidents[0]).toMatchObject({
      title: 'checkout 在 prod-ap 出现延迟突增',
      service: 'checkout',
      owner: 'checkout-oncall',
      blastRadius: '2 个区域'
    });
    expect(model.timeline).toHaveLength(3);
    expect(model.timeline[0]).toEqual({
      title: '09:08 开始缓解',
      copy: '回滚和重启动作已从告警证据包打开。',
      meta: 'checkout 延迟事件'
    });
    expect(model.ownership[0]).toEqual({
      owner: 'checkout-oncall',
      queue: '主响应人',
      copy: '保持告警、链路和发布上下文绑定到当前缓解线程。',
      meta: '2 个活跃交接'
    });
    expect(model.metrics).toEqual([
      { label: '打开事件', value: '3' },
      { label: '严重事件', value: '1' },
      { label: '缓解中', value: '1' },
      { label: '责任队列', value: '3' }
    ]);
    expect(model.checklist.map(item => item.meta)).toEqual(['已完成', '下一步', '预留']);
  });
});
