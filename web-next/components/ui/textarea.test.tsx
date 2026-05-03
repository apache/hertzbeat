import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Textarea } from './textarea';

describe('Textarea', () => {
  it('renders the cold shared multiline control without a visible resize handle by default', () => {
    const html = renderToStaticMarkup(<Textarea value="entity description" onChange={() => {}} />);

    expect(html).toContain('data-cold-textarea-owner="cold-textarea"');
    expect(html).toContain('resize-none');
    expect(html).toContain('entity description');
  });

  it('can opt into vertical resizing for current prose fields', () => {
    const html = renderToStaticMarkup(<Textarea value="" resize="vertical" onChange={() => {}} />);

    expect(html).toContain('resize-y');
  });
});
