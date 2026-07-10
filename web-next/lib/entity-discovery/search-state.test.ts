import { describe, expect, it } from 'vitest';
import {
  buildDiscoveryCandidateActionHref,
  buildDiscoveryCandidateEntityLookupUrl,
  buildDiscoveryCandidateExistingEntityHref,
  buildDiscoveryCandidateReturnHref,
  resolveDiscoveryCandidateContext,
  resolveDiscoveryCandidateEntityMatch,
  resolveDiscoverySearchSubmission
} from './search-state';

describe('entity discovery search state', () => {
  it('normalizes discovery search submission', () => {
    expect(resolveDiscoverySearchSubmission('  checkout  ')).toEqual({
      mode: 'search',
      normalizedSearch: 'checkout'
    });
    expect(resolveDiscoverySearchSubmission('   ')).toEqual({
      mode: 'idle',
      normalizedSearch: null
    });
  });

  it('preserves OTLP candidate identity context from discovery query parameters', () => {
    const context = resolveDiscoveryCandidateContext(
      new URLSearchParams(
        'identityKey=%20service.name%20&identityValue=%20checkout%20&serviceName=%20checkout-api%20&serviceNamespace=%20commerce%20&environment=%20prod%20&source=%20trace-drawer%20'
      )
    );

    expect(context).toEqual({
      source: 'otlp-candidate',
      returnSource: 'trace-drawer',
      identityKey: 'service.name',
      identityValue: 'checkout',
      serviceName: 'checkout-api',
      serviceNamespace: 'commerce',
      environment: 'prod',
      search: 'checkout-api'
    });

    expect(buildDiscoveryCandidateReturnHref(context!)).toBe(
      '/entities/discovery?identityKey=service.name&identityValue=checkout&serviceName=checkout-api&serviceNamespace=commerce&environment=prod&source=trace-drawer'
    );
    expect(buildDiscoveryCandidateActionHref(context!)).toBe(
      '/entities/new?source=otlp-candidate&identityKey=service.name&identityValue=checkout&serviceName=checkout-api&serviceNamespace=commerce&environment=prod&returnTo=%2Fentities%2Fdiscovery%3FidentityKey%3Dservice.name%26identityValue%3Dcheckout%26serviceName%3Dcheckout-api%26serviceNamespace%3Dcommerce%26environment%3Dprod%26source%3Dtrace-drawer'
    );
  });

  it('builds lookup and existing entity links for resolved OTLP candidates', () => {
    const context = resolveDiscoveryCandidateContext(
      new URLSearchParams('identityKey=service.name&identityValue=checkout&serviceName=billing-api&serviceNamespace=commerce&environment=prod&source=log-stream')
    )!;

    expect(buildDiscoveryCandidateEntityLookupUrl(context)).toBe(
      '/entities?pageIndex=0&pageSize=8&sort=gmtUpdate&order=desc&search=billing-api'
    );

    const match = resolveDiscoveryCandidateEntityMatch(context, [
      { entity: { id: 41, name: 'checkout', namespace: 'commerce', environment: 'prod' } },
      { entity: { id: 42, name: 'billing-api', displayName: 'Billing API', namespace: 'commerce', environment: 'prod' } }
    ]);

    expect(match).toEqual({ entityId: '42', entityName: 'Billing API' });
    expect(buildDiscoveryCandidateExistingEntityHref(context, match!)).toBe(
      '/entities/42?source=otlp-candidate&returnTo=%2Fentities%2Fdiscovery%3FidentityKey%3Dservice.name%26identityValue%3Dcheckout%26serviceName%3Dbilling-api%26serviceNamespace%3Dcommerce%26environment%3Dprod%26source%3Dlog-stream'
    );
  });

  it('does not resolve OTLP candidates to a different namespace or environment', () => {
    const context = resolveDiscoveryCandidateContext(
      new URLSearchParams('identityKey=service.name&identityValue=checkout&serviceName=billing-api&serviceNamespace=commerce&environment=prod')
    )!;

    expect(
      resolveDiscoveryCandidateEntityMatch(context, [
        { entity: { id: 42, name: 'billing-api', namespace: 'payments', environment: 'prod' } },
        { entity: { id: 43, name: 'billing-api', namespace: 'commerce', environment: 'stage' } }
      ])
    ).toBeNull();
  });

  it('ignores incomplete OTLP candidate query parameters', () => {
    expect(resolveDiscoveryCandidateContext(new URLSearchParams('identityKey=service.name'))).toBeNull();
    expect(resolveDiscoveryCandidateContext(new URLSearchParams('identityValue=checkout'))).toBeNull();
  });
});
