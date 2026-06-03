import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ColdConfirmDialog } from './cold-confirm-dialog';

describe('ColdConfirmDialog', () => {
  it('renders shared confirmation chrome from runtime messages while preserving caller labels', () => {
    const idleHtml = renderToStaticMarkup(
      <ColdConfirmDialog
        open
        title="Confirm delete"
        copy="This action cannot be undone."
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />
    );

    expect(idleHtml).toContain('data-cold-confirm-dialog="cold-confirm-dialog"');
    expect(idleHtml).toContain('Confirm operation');
    expect(idleHtml).toContain('Confirm delete');
    expect(idleHtml).toContain('This action cannot be undone.');
    expect(idleHtml).toContain('Confirm');
    expect(idleHtml).toContain('Cancel');

    const pendingHtml = renderToStaticMarkup(
      <ColdConfirmDialog
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
