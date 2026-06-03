import { describe, expect, it } from 'vitest';
import {
  HERTZBEAT_PRODUCT_LANGUAGE,
  findForbiddenProductLanguage,
  getHertzBeatSurfaceVocabulary,
  isAllowedExternalProductReference
} from './hertzbeat-product-language';

describe('HertzBeat product language contract', () => {
  it('defines the HertzBeat-native positioning and core operations loop', () => {
    expect(HERTZBEAT_PRODUCT_LANGUAGE.positioning).toBe(
      'open-source private-deployable enterprise operations observability platform'
    );
    expect(HERTZBEAT_PRODUCT_LANGUAGE.identity).toContain('enterprise operations');
    expect(HERTZBEAT_PRODUCT_LANGUAGE.identity).toContain('private-deployable observability');
    expect(HERTZBEAT_PRODUCT_LANGUAGE.coreLoop).toEqual([
      'collectors',
      'monitor templates',
      'entity catalog',
      'OTLP three signals',
      'alert closure'
    ]);
    expect(HERTZBEAT_PRODUCT_LANGUAGE.requiredVocabulary).toEqual(
      expect.arrayContaining([
        'collection closure',
        'monitor template',
        'collector fleet',
        'entity merge',
        'alert noise reduction',
        'private-deployable observability',
        'enterprise operations'
      ])
    );
  });

  it('gives OTLP, entity, signal, and alert surfaces HertzBeat-native vocabulary', () => {
    expect(getHertzBeatSurfaceVocabulary('otlp')).toEqual(
      expect.arrayContaining(['collection closure', 'collector fleet', 'ingest quality', 'entity merge'])
    );
    expect(getHertzBeatSurfaceVocabulary('entities')).toEqual(
      expect.arrayContaining(['entity catalog', 'entity merge', 'collection source', 'upstream/downstream relations'])
    );
    expect(getHertzBeatSurfaceVocabulary('metrics')).toEqual(
      expect.arrayContaining(['related metrics', 'monitor template', 'threshold rule'])
    );
    expect(getHertzBeatSurfaceVocabulary('logs')).toEqual(
      expect.arrayContaining(['related logs', 'collection source', 'exception localization'])
    );
    expect(getHertzBeatSurfaceVocabulary('traces')).toEqual(
      expect.arrayContaining(['related traces', 'service calls', 'traceId/spanId'])
    );
    expect(getHertzBeatSurfaceVocabulary('alerts')).toEqual(
      expect.arrayContaining(['alert center', 'alert noise reduction', 'silence', 'inhibit', 'notification closure'])
    );
  });

  it('allows external product names only as source or migration references', () => {
    expect(isAllowedExternalProductReference('Datadog', 'source-connector')).toBe(true);
    expect(isAllowedExternalProductReference('self-hosted SigNoZ', 'source-connector')).toBe(true);
    expect(isAllowedExternalProductReference('Google Cloud Observability', 'product-copy')).toBe(false);
    expect(isAllowedExternalProductReference('Datadog-style dashboard', 'product-copy')).toBe(false);
  });

  it('flags generic APM and copied external-product narratives in product copy', () => {
    expect(findForbiddenProductLanguage('HertzBeat is only an APM platform')).toEqual(
      expect.arrayContaining(['generic-apm-only-narrative'])
    );
    expect(findForbiddenProductLanguage('SigNoZ-style Service Map for all services')).toEqual(
      expect.arrayContaining(['external-product-style-copy', 'service-map-copy'])
    );
    expect(findForbiddenProductLanguage('Save this view and Create an Alert')).toEqual(
      expect.arrayContaining(['generic-query-tool-actions'])
    );
    expect(
      findForbiddenProductLanguage('Migrate a self-hosted SigNoZ pipeline into the HertzBeat OTLP ingest flow.', {
        context: 'source-connector'
      })
    ).toEqual([]);
  });
});
