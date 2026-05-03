import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ObservabilityDetailRows } from './detail-rows';

describe('observability detail rows', () => {
  it('renders shared detail rows with optional meta copy', () => {
    const html = renderToStaticMarkup(
      <ObservabilityDetailRows
        rows={[
          { title: 'Instance', copy: '10.0.0.1', meta: 'monitor target' },
          { title: 'Updated', copy: '2026-04-10 18:00:00' }
        ]}
      />
    );

    expect(html).toContain('Instance');
    expect(html).toContain('10.0.0.1');
    expect(html).toContain('monitor target');
    expect(html).toContain('Updated');
    expect(html).toContain('2026-04-10 18:00:00');
  });
});
