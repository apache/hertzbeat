import { describe, expect, it } from 'vitest';
import {
  buildDiscoveryCandidateActionHref,
  resolveDiscoveryCandidateContext,
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
        'identityKey=%20service.name%20&identityValue=%20checkout%20&serviceName=%20checkout-api%20&serviceNamespace=%20commerce%20&environment=%20prod%20'
      )
    );

    expect(context).toEqual({
      source: 'otlp-candidate',
      identityKey: 'service.name',
      identityValue: 'checkout',
      serviceName: 'checkout-api',
      serviceNamespace: 'commerce',
      environment: 'prod',
      search: 'checkout-api'
    });

    expect(buildDiscoveryCandidateActionHref(context!)).toBe(
      '/entities/new?source=otlp-candidate&identityKey=service.name&identityValue=checkout&serviceName=checkout-api&serviceNamespace=commerce&environment=prod'
    );
  });

  it('ignores incomplete OTLP candidate query parameters', () => {
    expect(resolveDiscoveryCandidateContext(new URLSearchParams('identityKey=service.name'))).toBeNull();
    expect(resolveDiscoveryCandidateContext(new URLSearchParams('identityValue=checkout'))).toBeNull();
  });
});
