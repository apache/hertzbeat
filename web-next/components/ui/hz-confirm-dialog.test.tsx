import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { HzConfirmDialog } from './hz-confirm-dialog';

describe('HzConfirmDialog', () => {
  it('renders shared confirmation chrome from runtime messages while preserving caller labels', () => {
    const idleHtml = renderToStaticMarkup(
      <HzConfirmDialog
        open
        title="Confirm delete"
        copy="This action cannot be undone."
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />
    );

    expect(idleHtml).toContain('data-hz-confirm-dialog="hz-confirm-dialog"');
    expect(idleHtml).toContain('Confirm operation');
    expect(idleHtml).toContain('Confirm delete');
    expect(idleHtml).toContain('This action cannot be undone.');
    expect(idleHtml).toContain('Confirm');
    expect(idleHtml).toContain('Cancel');

    const pendingHtml = renderToStaticMarkup(
      <HzConfirmDialog
        open
        title="Confirm delete"
        copy="This action cannot be undone."
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        pending
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />
    );

    expect(pendingHtml).toContain('Processing');
    expect(pendingHtml).toContain('disabled=""');
  });
});
