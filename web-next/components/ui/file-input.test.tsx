import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FileInput } from './file-input';

describe('FileInput', () => {
  it('keeps native file selection behind the shared cold file primitive', () => {
    const html = renderToStaticMarkup(<FileInput name="monitor-import" data-testid="monitor-import-file" />);

    expect(html).toContain('data-hz-file-input-owner="hertzbeat-ui-file-input"');
    expect(html).toContain('data-hz-file-input-control="native-hidden-file"');
    expect(html).toContain('type="file"');
    expect(html).toContain('class="hidden"');
  });
});
