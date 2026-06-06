import { describe, expect, it } from 'vitest';
import { buildOtlpMetricsCsv, buildOtlpMetricsExportFilename, buildOtlpMetricsJsonl } from './export';
import type { OtlpMetricSeriesView } from './view-model';

describe('otlp metrics export helpers', () => {
  const seriesList: OtlpMetricSeriesView[] = [
    {
      key: 'http.server.duration-0',
      name: 'http.server.duration',
      labels: {
        __name__: 'http.server.duration',
        'service.name': 'checkout',
        route: 'POST /checkout'
      },
      description: 'Server duration',
      metricType: 'histogram',
      unit: 'ms',
      points: [
        [1713200000000, 42],
        [1713200060000, null]
      ],
      latestValue: 42
    }
  ];

  it('builds CSV rows from every loaded series sample with escaped labels', () => {
    expect(buildOtlpMetricsCsv(seriesList)).toBe([
      'metric,seriesKey,timestamp,value,labels',
      'http.server.duration,http.server.duration-0,1713200000000,42,"{""__name__"":""http.server.duration"",""service.name"":""checkout"",""route"":""POST /checkout""}"',
      'http.server.duration,http.server.duration-0,1713200060000,,"{""__name__"":""http.server.duration"",""service.name"":""checkout"",""route"":""POST /checkout""}"'
    ].join('\n'));
  });

  it('builds structured JSONL rows with metric labels intact', () => {
    expect(buildOtlpMetricsJsonl(seriesList).split('\n')[0]).toBe(
      '{"metric":"http.server.duration","seriesKey":"http.server.duration-0","timestamp":1713200000000,"value":42,"labels":{"__name__":"http.server.duration","service.name":"checkout","route":"POST /checkout"}}'
    );
  });

  it('builds filesystem-safe export filenames by format', () => {
    expect(buildOtlpMetricsExportFilename('csv', new Date('2026-04-16T22:03:04.000Z'))).toBe('hertzbeat-metrics-20260416-220304.csv');
    expect(buildOtlpMetricsExportFilename('jsonl', new Date('2026-04-16T22:03:04.000Z'))).toBe('hertzbeat-metrics-20260416-220304.jsonl');
  });
});
