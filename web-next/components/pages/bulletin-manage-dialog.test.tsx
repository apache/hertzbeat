import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTranslatorMock } from '../../test/i18n-test-helper';

vi.mock('../ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('../ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

vi.mock('../ui/hz-code-editor', () => ({
  HzCodeEditor: ({ value, language, minHeight, onChange: _onChange, ...props }: any) => (
    <div
      data-hz-code-editor="codemirror"
      data-hz-code-editor-language={language}
      data-hz-code-editor-min-height={minHeight}
      data-bulletin-fields-code-editor={props['data-bulletin-fields-code-editor']}
    >
      {value}
    </div>
  )
}));

vi.mock('../workbench/overlay-dialog', () => ({
  OverlayDialog: ({ open, title, kicker, footer, children, closeLabel }: any) => (
    open ? (
      <div data-overlay-dialog="true" data-close-label={closeLabel}>
        <span>{kicker}</span>
        <h2>{title}</h2>
        {children}
        <footer>{footer}</footer>
      </div>
    ) : null
  )
}));

describe('BulletinManageDialog', () => {
  it('uses the shared cold CodeMirror editor for the bulletin metrics JSON payload', async () => {
    const { BulletinManageDialog } = await import('./bulletin-manage-dialog');
    const source = readFileSync(resolve(process.cwd(), 'components/pages/bulletin-manage-dialog.tsx'), 'utf8');
    const t = createTranslatorMock({
      overrides: {
        'menu.monitor.bulletin': 'Bulletin',
        'bulletin.new': 'New bulletin',
        'bulletin.name': 'Bulletin name',
        'bulletin.monitor.type': 'Monitor type',
        'bulletin.monitor.name': 'Monitor object',
        'bulletin.monitor.metrics': 'Monitor metrics',
        'common.dialog.close': 'Close dialog',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.saving': 'Saving'
      }
    });

    const html = renderToStaticMarkup(
      <BulletinManageDialog
        open
        mode="new"
        draft={{
          name: 'Ops board',
          app: 'website',
          monitorIdsText: '1, 2',
          fieldsJson: '{\n  "cpu": ["usage"]\n}'
        }}
        error={null}
        saving={false}
        t={t}
        onClose={() => {}}
        onSave={() => {}}
        onDraftChange={() => {}}
      />
    );

    expect(html).toContain('data-bulletin-fields-code-editor="metrics-json"');
    expect(html).toContain('data-hz-code-editor="codemirror"');
    expect(html).toContain('data-hz-code-editor-language="json"');
    expect(html).toContain('data-hz-code-editor-min-height="260px"');
    expect(html).toContain('data-close-label="Close dialog"');
    expect(html).toContain('aria-label="Bulletin name"');
    expect(html).toContain('aria-label="Monitor type"');
    expect(html).toContain('aria-label="Monitor object"');
    expect(html).toContain('&quot;cpu&quot;');
    expect(source).toContain("import { HzCodeEditor } from '../ui/hz-code-editor';");
    expect(source).toContain('data-bulletin-fields-code-editor="metrics-json"');
    expect(source).toContain('language="json"');
    expect(source).toContain('onChange={nextValue => onDraftChange({ ...draft, fieldsJson: nextValue })}');
    expect(source).not.toContain("import { EditorRow } from '../workbench/primitives';");
    expect(source).not.toContain('<EditorRow');
  });
});
