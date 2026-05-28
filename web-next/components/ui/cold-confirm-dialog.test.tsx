import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ColdConfirmDialog } from './cold-confirm-dialog';

describe('ColdConfirmDialog', () => {
  it('renders shared confirmation chrome from runtime messages while preserving caller labels', () => {
    const idleHtml = renderToStaticMarkup(
      <ColdConfirmDialog
        open
        title="确认删除"
        copy="删除后不可恢复。"
        confirmLabel="确认"
        cancelLabel="取消"
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />
    );

    expect(idleHtml).toContain('data-cold-confirm-dialog="cold-confirm-dialog"');
    expect(idleHtml).toContain('Confirm operation');
    expect(idleHtml).toContain('确认删除');
    expect(idleHtml).toContain('删除后不可恢复。');
    expect(idleHtml).toContain('确认');
    expect(idleHtml).toContain('取消');

    const pendingHtml = renderToStaticMarkup(
      <ColdConfirmDialog
        open
        title="确认删除"
        copy="删除后不可恢复。"
        confirmLabel="确认"
        cancelLabel="取消"
        pending
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />
    );

    expect(pendingHtml).toContain('Processing');
    expect(pendingHtml).toContain('disabled=""');
  });
});
