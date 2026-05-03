import {
  buildObservabilityContextChips,
  buildObservabilityScopeCopy,
  getObservabilitySubjectLabel,
  hasObservabilityConsoleContext,
  normalizeObservabilityConsoleContext
} from './observability-console-context';

describe('observability-console-context', () => {
  it('should normalize and trim context values before they are consumed by a workbench', () => {
    const context = normalizeObservabilityConsoleContext({
      entityId: ' 42 ',
      entityName: '  Checkout Service  ',
      serviceName: ' ',
      serviceNamespace: ' commerce ',
      environment: ' prod '
    });

    expect(context).toEqual({
      entityId: '42',
      entityName: 'Checkout Service',
      serviceName: undefined,
      serviceNamespace: 'commerce',
      environment: 'prod',
      resourceType: undefined,
      resourceId: undefined,
      start: undefined,
      end: undefined,
      returnTo: undefined,
      returnLabel: undefined
    });
  });

  it('should expose object, service, namespace and environment chips in a stable order', () => {
    const chips = buildObservabilityContextChips(
      {
        entityName: 'Checkout Service',
        serviceName: 'checkout',
        serviceNamespace: 'commerce',
        environment: 'prod'
      },
      {
        object: '调查对象',
        service: '服务',
        namespace: '命名空间',
        environment: '环境'
      },
      '日志工作台'
    );

    expect(chips).toEqual([
      { label: '调查对象', value: 'Checkout Service' },
      { label: '服务', value: 'checkout' },
      { label: '命名空间', value: 'commerce' },
      { label: '环境', value: 'prod' }
    ]);
  });

  it('should build a service-aware narrative when the current investigation includes a service filter', () => {
    const copy = buildObservabilityScopeCopy(
      {
        entityName: 'Checkout Service',
        serviceName: 'checkout'
      },
      {
        service: '当前正在围绕 {{object}} 调查，可继续沿服务 {{service}} 的信号收窄范围。',
        object: '当前正在围绕 {{object}} 调查，可继续通过当前信号核对上下文与异常范围。',
        empty: '当前正在沿时间范围和筛选条件继续调查。'
      },
      '日志工作台'
    );

    expect(copy).toBe('当前正在围绕 Checkout Service 调查，可继续沿服务 checkout 的信号收窄范围。');
  });

  it('should fall back to a generic workbench copy when no investigation object is available', () => {
    expect(hasObservabilityConsoleContext({})).toBeFalse();
    expect(getObservabilitySubjectLabel({}, '链路工作台')).toBe('链路工作台');
    expect(
      buildObservabilityScopeCopy(
        {},
        {
          service: '当前正在围绕 {{object}} 调查，可继续沿服务 {{service}} 的信号收窄范围。',
          object: '当前正在围绕 {{object}} 调查，可继续通过当前信号核对上下文与异常范围。',
          empty: '当前正在沿时间范围和筛选条件继续调查。'
        },
        '链路工作台'
      )
    ).toBe('当前正在沿时间范围和筛选条件继续调查。');
  });
});
