import { describe, expect, it } from 'vitest';
import {
  HERTZBEAT_PRODUCT_LANGUAGE,
  findForbiddenProductLanguage,
  getHertzBeatSurfaceVocabulary,
  isAllowedExternalProductReference
} from './hertzbeat-product-language';

describe('HertzBeat product language contract', () => {
  it('defines the HertzBeat-native positioning and core operations loop', () => {
    expect(HERTZBEAT_PRODUCT_LANGUAGE.positioning).toBe('开源私有化的企业运维可观测平台');
    expect(HERTZBEAT_PRODUCT_LANGUAGE.identity).toContain('企业运维视角');
    expect(HERTZBEAT_PRODUCT_LANGUAGE.identity).toContain('私有化可观测');
    expect(HERTZBEAT_PRODUCT_LANGUAGE.coreLoop).toEqual([
      '采集器',
      '监控模板',
      '实体中心',
      'OTLP 三信号',
      '告警闭环'
    ]);
    expect(HERTZBEAT_PRODUCT_LANGUAGE.requiredVocabulary).toEqual(
      expect.arrayContaining(['采集闭环', '监控模板', '采集集群', '实体归并', '告警降噪', '私有化可观测', '企业运维视角'])
    );
  });

  it('gives OTLP, entity, signal, and alert surfaces HertzBeat-native vocabulary', () => {
    expect(getHertzBeatSurfaceVocabulary('otlp')).toEqual(expect.arrayContaining(['采集闭环', '采集集群', '接入质量', '实体归并']));
    expect(getHertzBeatSurfaceVocabulary('entities')).toEqual(expect.arrayContaining(['实体中心', '实体归并', '采集来源', '上下游关系']));
    expect(getHertzBeatSurfaceVocabulary('metrics')).toEqual(expect.arrayContaining(['关联指标', '监控模板', '阈值规则']));
    expect(getHertzBeatSurfaceVocabulary('logs')).toEqual(expect.arrayContaining(['关联日志', '采集来源', '异常定位']));
    expect(getHertzBeatSurfaceVocabulary('traces')).toEqual(expect.arrayContaining(['关联链路', '服务调用', 'traceId/spanId']));
    expect(getHertzBeatSurfaceVocabulary('alerts')).toEqual(expect.arrayContaining(['告警中心', '告警降噪', '静默', '抑制', '通知闭环']));
  });

  it('allows external product names only as source or migration references', () => {
    expect(isAllowedExternalProductReference('Datadog', 'source-connector')).toBe(true);
    expect(isAllowedExternalProductReference('SigNoZ 自托管', 'source-connector')).toBe(true);
    expect(isAllowedExternalProductReference('Google Cloud Observability', 'product-copy')).toBe(false);
    expect(isAllowedExternalProductReference('Datadog-style dashboard', 'product-copy')).toBe(false);
  });

  it('flags generic APM and copied external-product narratives in product copy', () => {
    expect(findForbiddenProductLanguage('HertzBeat 是 APM 平台')).toEqual(
      expect.arrayContaining(['generic-apm-only-narrative'])
    );
    expect(findForbiddenProductLanguage('SigNoZ-style Service Map for all services')).toEqual(
      expect.arrayContaining(['external-product-style-copy', 'service-map-copy'])
    );
    expect(findForbiddenProductLanguage('Save this view and Create an Alert')).toEqual(
      expect.arrayContaining(['generic-query-tool-actions'])
    );
    expect(
      findForbiddenProductLanguage('把自托管 SigNoZ 管道迁移到 HertzBeat 的 OTLP 接入流程。', {
        context: 'source-connector'
      })
    ).toEqual([]);
  });
});
