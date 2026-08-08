/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { describe, expect, it, vi } from 'vitest';

import { downloadSetupArtifact } from './setup-download';

describe('setup download adapter', () => {
  it('clicks an attachment URL and revokes it immediately', () => {
    const click = vi.fn();
    const remove = vi.fn();
    const anchor = { click, remove, download: '', href: '' };
    const createObjectURL = vi.fn(() => 'blob:setup-artifact');
    const revokeObjectURL = vi.fn();
    const createElement = vi.fn(() => anchor);
    const append = vi.fn();

    downloadSetupArtifact(
      { blob: new Blob(['opaque']), fileName: 'hertzbeat-setup.env', mediaType: 'text/plain' },
      { createObjectURL, revokeObjectURL },
      { createElement, body: { append } }
    );

    expect(anchor).toMatchObject({ download: 'hertzbeat-setup.env', href: 'blob:setup-artifact' });
    expect(append).toHaveBeenCalledWith(anchor);
    expect(click).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:setup-artifact');
  });
});
