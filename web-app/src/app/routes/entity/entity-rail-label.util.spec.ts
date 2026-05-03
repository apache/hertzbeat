import { getEntityRailDisplayLabel } from './entity-rail-label.util';

describe('entity rail label util', () => {
  it('should shorten long navigation labels without changing the full label source', () => {
    expect(getEntityRailDisplayLabel('k8s_workload', 'K8s 工作负载')).toBe('K8s 负载');
    expect(getEntityRailDisplayLabel('service', '服务')).toBe('服务');
    expect(getEntityRailDisplayLabel('custom', '自定义标签')).toBe('自定义标签');
  });
});
