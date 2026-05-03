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

vi.mock('../ui/cold-code-editor', () => ({
  ColdCodeEditor: ({ value, language, minHeight, onChange: _onChange, ...props }: any) => (
    <div
      data-cold-code-editor="codemirror"
      data-cold-code-editor-language={language}
      data-cold-code-editor-min-height={minHeight}
      data-bulletin-fields-code-editor={props['data-bulletin-fields-code-editor']}
    >
      {value}
    </div>
  )
}));

vi.mock('../workbench/overlay-dialog', () => ({
  OverlayDialog: ({ open, title, kicker, footer, children }: any) => (
    open ? (
      <div data-overlay-dialog="true">
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
        'menu.monitor.bulletin': '公告',
        'bulletin.new': '新增公告',
        'bulletin.name': '公告名称',
        'bulletin.monitor.type': '监控类型',
        'bulletin.monitor.name': '监控对象',
        'bulletin.monitor.metrics': '监控指标',
        'common.cancel': '取消',
        'common.save': '保存',
        'common.saving': '保存中'
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
    expect(html).toContain('data-cold-code-editor="codemirror"');
    expect(html).toContain('data-cold-code-editor-language="json"');
    expect(html).toContain('data-cold-code-editor-min-height="260px"');
    expect(html).toContain('&quot;cpu&quot;');
    expect(source).toContain("import { ColdCodeEditor } from '../ui/cold-code-editor';");
    expect(source).toContain('data-bulletin-fields-code-editor="metrics-json"');
    expect(source).toContain('language="json"');
    expect(source).toContain('onChange={nextValue => onDraftChange({ ...draft, fieldsJson: nextValue })}');
    expect(source).not.toContain("import { EditorRow } from '../workbench/primitives';");
    expect(source).not.toContain('<EditorRow');
  });
});
