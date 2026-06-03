import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';
import { BulletinMetricsTable } from './bulletin-metrics-table';

describe('BulletinMetricsTable', () => {
  it('renders fixed table labels and no-data badges through runtime i18n', () => {
    const t = createTranslatorMock();
    const html = renderToStaticMarkup(
      <BulletinMetricsTable
        app="website"
        loading={false}
        error={null}
        t={t}
        data={{
          content: [
            {
              monitorId: 7,
              monitorName: 'Checkout probe',
              host: 'checkout.example.com',
              metrics: [
                {
                  name: 'response_time',
                  fields: [[{ key: 'p95', value: 'NO_DATA' }]]
                }
              ]
            }
          ]
        }}
      />
    );

    expect(html).toContain('data-bulletin-metrics-table="true"');
    expect(html).toContain('App');
    expect(html).toContain('Host');
    expect(html).toContain('No Data Available');
    expect(t).toHaveBeenCalledWith('bulletin.metrics.column.app');
    expect(t).toHaveBeenCalledWith('bulletin.metrics.column.host');
    expect(t).toHaveBeenCalledWith('bulletin.metrics.no-data');
  });

  it('renders missing metric values with the localized empty fallback', () => {
    const emptyMetricValue = 'No metric value';
    const t = createTranslatorMock({
      overrides: {
        'common.none': emptyMetricValue
      }
    });
    const html = renderToStaticMarkup(
      <BulletinMetricsTable
        app="website"
        loading={false}
        error={null}
        t={t}
        data={{
          content: [
            {
              monitorId: 7,
              monitorName: 'Checkout probe',
              host: 'checkout.example.com',
              metrics: [
                {
                  name: 'response_time',
                  fields: [[{ key: 'p95', value: 'NO_DATA' }]]
                }
              ]
            },
            {
              monitorId: 8,
              monitorName: 'Cart probe',
              host: 'cart.example.com',
              metrics: []
            }
          ]
        }}
      />
    );

    expect(html).toContain('Cart probe');
    expect(html).toContain(emptyMetricValue);
    expect(t).toHaveBeenCalledWith('common.none');
  });

  it('renders missing monitor identity with the localized empty fallback', () => {
    const missingMonitorIdentity = 'No monitor identity';
    const t = createTranslatorMock({
      overrides: {
        'common.none': missingMonitorIdentity
      }
    });
    const html = renderToStaticMarkup(
      <BulletinMetricsTable
        app="website"
        loading={false}
        error={null}
        t={t}
        data={{
          content: [
            {
              monitorId: 7,
              monitorName: 'Checkout probe',
              host: 'checkout.example.com',
              metrics: [
                {
                  name: 'response_time',
                  fields: [[{ key: 'p95', value: '250', unit: 'ms' }]]
                }
              ]
            },
            {
              monitorId: 8,
              monitorName: '',
              host: '',
              metrics: []
            }
          ]
        }}
      />
    );

    expect(html).toContain('Checkout probe');
    expect((html.match(new RegExp(missingMonitorIdentity, 'g')) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(t).toHaveBeenCalledWith('common.none');
  });
});
