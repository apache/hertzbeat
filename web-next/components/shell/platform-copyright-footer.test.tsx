import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PlatformCopyrightFooter } from './platform-copyright-footer';

describe('PlatformCopyrightFooter', () => {
  it('renders the shared Apache HertzBeat copyright copy', () => {
    const html = renderToStaticMarkup(<PlatformCopyrightFooter version="1.0.0" />);

    expect(html).toContain('Apache HertzBeat™ 1.0.0');
    expect(html).toContain('Licensed under the Apache License, Version 2.0');
    expect(html).toContain('https://hertzbeat.apache.org');
  });
});
