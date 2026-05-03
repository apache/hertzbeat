import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import ExceptionPage from './page';

const mockSurfaceProps = vi.hoisted(() => ({
  type: ''
}));

vi.mock('../../../components/pages/exception-center-surface', () => ({
  ExceptionCenterSurface: ({ type }: { type: string }) => {
    mockSurfaceProps.type = type;
    return <div data-exception-center-surface="hertzbeat-exceptions" data-exception-type={type} />;
  }
}));

describe('ExceptionPage', () => {
  it.each(['403', '404', '500'])('renders the shared exception center surface for exception type %s', async type => {
    const html = renderToStaticMarkup(await ExceptionPage({ params: Promise.resolve({ type }) }));

    expect(html).toContain('data-exception-center-surface="hertzbeat-exceptions"');
    expect(html).toContain(`data-exception-type="${type}"`);
    expect(mockSurfaceProps.type).toBe(type);
  });
});
