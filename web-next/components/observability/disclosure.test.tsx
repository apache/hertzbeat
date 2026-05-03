import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ObservabilityDisclosure } from './disclosure';

describe('observability disclosure', () => {
  it('renders a shared collapsible disclosure shell', () => {
    const html = renderToStaticMarkup(
      <ObservabilityDisclosure title="Monitor payload">
        <div>payload-body</div>
      </ObservabilityDisclosure>
    );

    expect(html).toContain('Monitor payload');
    expect(html).toContain('payload-body');
    expect(html).toContain('<details');
  });
});
