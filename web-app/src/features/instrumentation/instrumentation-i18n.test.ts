/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { describe, expect, it } from 'vitest';

import en from '@/assets/i18n/en-us.json';
import ja from '@/assets/i18n/ja-jp.json';
import pt from '@/assets/i18n/pt-br.json';
import zhCn from '@/assets/i18n/zh-cn.json';
import zhTw from '@/assets/i18n/zh-tw.json';

const locales = { 'en-US': en, 'zh-CN': zhCn, 'zh-TW': zhTw, 'ja-JP': ja, 'pt-BR': pt };
const directoryGroups = [
  'quick_start',
  'applications',
  'collectors',
  'logs',
  'infrastructure',
  'cloud',
  'databases',
  'messaging'
] as const;
const directorySources = [
  'quick_start',
  'java',
  'dotnet',
  'nodejs',
  'python',
  'php',
  'go',
  'other_languages',
  'ruby',
  'rust',
  'elixir',
  'swift',
  'cpp',
  'hertzbeat_hybrid_collector',
  'opentelemetry_collector',
  'logstash',
  'vector',
  'hertzbeat_host_metrics',
  'hertzbeat_prometheus',
  'hertzbeat_file_logs',
  'fluent_bit',
  'fluentd',
  'syslog',
  'http_logs',
  'docker',
  'kubernetes',
  'nginx',
  'postgresql',
  'mysql',
  'redis',
  'mongodb',
  'kafka',
  'rabbitmq',
  'aws_ec2',
  'aws_rds',
  'aws_lambda',
  'aws_eks',
  'azure_vm',
  'azure_aks',
  'gcp_compute_engine',
  'gcp_gke'
] as const;
const backendKeys = [
  ...directoryGroups.map(group => `instrumentation.v2.directory.group.${group}`),
  ...directorySources.flatMap(source => [
    `instrumentation.v2.directory.source.${source}`,
    `instrumentation.v2.directory.source.${source}_description`
  ]),
  'instrumentation.v2.source.quick_start',
  'instrumentation.v2.source.quick_start_description',
  'instrumentation.v2.source.application',
  'instrumentation.v2.source.application_description',
  'instrumentation.v2.source.existing_opentelemetry',
  'instrumentation.v2.source.existing_opentelemetry_description',
  'instrumentation.v2.recipe.opentelemetry_telemetrygen',
  'instrumentation.v2.recipe.existing_otlp',
  'instrumentation.v2.block.install_telemetrygen',
  'instrumentation.v2.block.send_metrics',
  'instrumentation.v2.block.send_logs',
  'instrumentation.v2.block.send_traces',
  'instrumentation.v2.block.cleanup_telemetrygen',
  'instrumentation.v2.block.configure_exporter',
  'instrumentation.v2.block.merge_exporter',
  'instrumentation.v2.block.restart_collector',
  'instrumentation.v2.block.validate_signals',
  'instrumentation.v2.block.official_source',
  'instrumentation.v2.block.no_persistence',
  'instrumentation.v2.note.telemetrygen_no_persistence',
  'instrumentation.v2.note.merge_exporter_into_each_pipeline',
  'instrumentation.v2.note.restart_collector_for_deployment',
  'instrumentation.v2.check.detect_scoped_signals',
  'instrumentation.location.application_host',
  'instrumentation.location.application_environment',
  'instrumentation.location.application_process',
  'instrumentation.location.container_definition',
  'instrumentation.location.hertzbeat_ui',
  'instrumentation.location.otel_collector',
  'instrumentation.location.external'
] as const;

describe('instrumentation v2 locale contract', () => {
  it('keeps the v2 structure identical across all supported locales', () => {
    const expected = flatten(en.instrumentation.v2);
    Object.values(locales).forEach(locale => expect(flatten(locale.instrumentation.v2)).toEqual(expected));
  });

  it('localizes every backend-owned source and guidance key', () => {
    Object.entries(locales).forEach(([localeName, locale]) => {
      backendKeys.forEach(key => {
        const value = lookup(locale, key);
        expect(value, `${localeName}: ${key}`).toBeTypeOf('string');
        expect(String(value).trim(), `${localeName}: ${key}`).not.toBe('');
        expect(value, `${localeName}: ${key}`).not.toBe(key);
      });
    });
  });

  it('keeps catalog loading failure distinct from missing localized guidance', () => {
    Object.entries(locales).forEach(([localeName, locale]) => {
      const { loadError, unknownGuidance } = locale.instrumentation.v2;
      expect(loadError.trim(), localeName).not.toBe('');
      expect(loadError, localeName).not.toBe(unknownGuidance);
      expect(loadError, localeName).not.toContain('instrumentation.v2');
    });
  });
});

function flatten(value: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(value)
    .flatMap(([key, item]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return item && typeof item === 'object' && !Array.isArray(item)
        ? flatten(item as Record<string, unknown>, path)
        : [path];
    })
    .sort();
}

function lookup(value: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[segment];
  }, value);
}
