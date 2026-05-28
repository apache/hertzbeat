import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { OverviewDetailDialog } from './overview-detail-dialog';

describe('OverviewDetailDialog', () => {
  it('renders the status badge tone supplied by the caller', () => {
    const html = renderToStaticMarkup(
      <OverviewDetailDialog
        open
        onClose={() => undefined}
        title="checkout-service service"
        subtitle="Affected item"
        description="Latency threshold breached"
        statusTone="danger"
        statusLabel="Critical"
        sections={[{ label: 'Owner', value: 'Platform' }]}
        closeLabel="Close"
      />
    );

    expect(html).toContain('data-overview-detail-dialog="true"');
    expect(html).toContain('data-overview-detail-status-tone="danger"');
    expect(html).toContain('Critical');
  });
});
