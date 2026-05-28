import { describe, expect, it } from 'vitest';
import { readEntityNewDraftSeed } from './query-state';

describe('entity editor query state', () => {
  it('normalizes multi-value URL search params into the first entity new telemetry seed value', () => {
    expect(
      readEntityNewDraftSeed({
        source: ['telemetry', 'manual'],
        monitorId: ['42', '99']
      })
    ).toEqual({
      source: 'telemetry',
      monitorId: '42'
    });
  });

  it('preserves the manual new-entity draft seed when query values are absent', () => {
    expect(readEntityNewDraftSeed()).toEqual({
      source: null,
      monitorId: null
    });
  });

  it('preserves OTLP candidate draft seed identity context from discovery handoff', () => {
    expect(
      readEntityNewDraftSeed({
        source: 'otlp-candidate',
        identityKey: ' service.name ',
        identityValue: ' billing ',
        serviceName: ' billing-api ',
        serviceNamespace: ' commerce ',
        environment: ' prod '
      })
    ).toEqual({
      source: 'otlp-candidate',
      monitorId: null,
      identityKey: 'service.name',
      identityValue: 'billing',
      serviceName: 'billing-api',
      serviceNamespace: 'commerce',
      environment: 'prod'
    });
  });
});
