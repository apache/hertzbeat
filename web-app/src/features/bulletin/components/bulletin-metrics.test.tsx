/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { BulletinMetricsPanel } from './bulletin-metrics';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('Bulletin metrics table', () => {
  afterEach(cleanup);

  it('renders one monitor row beneath grouped metric and field headers', () => {
    render(
      <MemoryRouter>
        <BulletinMetricsPanel
          state={{
            kind: 'ready',
            data: {
              name: 'Database',
              content: [
                {
                  monitorName: 'primary',
                  monitorId: 7,
                  host: 'db.local',
                  metrics: [
                    {
                      name: 'basic',
                      fields: [
                        [
                          { key: 'version', unit: '', value: '8.0', status: 'value' },
                          { key: 'port', unit: '', value: '3306', status: 'value' }
                        ]
                      ]
                    }
                  ]
                }
              ]
            }
          }}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('columnheader', { name: 'basic' })).toHaveAttribute('colspan', '2');
    expect(screen.getByRole('columnheader', { name: 'version' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'port' })).toBeInTheDocument();
    const monitorRow = screen.getByRole('row', { name: /primary db\.local 8\.0 3306/ });
    expect(within(monitorRow).getByRole('link', { name: 'primary' })).toHaveAttribute('href', '/monitors/7');
    expect(screen.queryByRole('columnheader', { name: 'bulletin.metrics.metric' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'bulletin.metrics.field' })).not.toBeInTheDocument();
  });
});
