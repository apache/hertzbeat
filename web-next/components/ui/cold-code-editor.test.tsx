import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value, readOnly, editable, extensions, height, basicSetup, theme, onChange, ...props }: any) => (
    <div
      data-testid={props['data-testid']}
      data-mocked-codemirror="true"
      data-readonly={readOnly ? 'true' : 'false'}
      data-editable={editable ? 'true' : 'false'}
      data-height={height}
      data-basic-setup={basicSetup ? 'true' : 'false'}
      data-theme={typeof theme === 'string' ? theme : theme ? 'custom-dark' : 'missing'}
      data-extension-count={Array.isArray(extensions) ? String(extensions.length) : '0'}
      onClick={() => onChange?.(`${value}\nnext`)}
    >
      {value}
    </div>
  )
}));

vi.mock('@codemirror/lang-yaml', () => ({ yaml: () => 'yaml-extension' }));
vi.mock('@codemirror/lang-json', () => ({ json: () => 'json-extension' }));
vi.mock('@codemirror/lang-html', () => ({ html: () => 'html-extension' }));
vi.mock('@codemirror/lang-javascript', () => ({ javascript: () => 'javascript-extension' }));
vi.mock('@codemirror/view', () => ({
  EditorView: {
    lineWrapping: 'line-wrapping-extension',
    theme: () => 'theme-extension'
  }
}));
vi.mock('@codemirror/state', () => ({
  EditorState: {
    readOnly: {
      of: () => 'readonly-extension'
    }
  }
}));

describe('ColdCodeEditor', () => {
  it('is backed by CodeMirror and carries the HertzBeat cold editor contract', async () => {
    const componentPath = resolve(process.cwd(), 'components/ui/cold-code-editor.tsx');

    expect(existsSync(componentPath)).toBe(true);

    const source = readFileSync(componentPath, 'utf8');
    expect(source).toContain("from '@uiw/react-codemirror'");
    expect(source).toContain("from '@codemirror/lang-yaml'");
    expect(source).toContain("from '@codemirror/lang-json'");
    expect(source).toContain("from '@codemirror/lang-html'");
    expect(source).toContain('EditorView.lineWrapping');
    expect(source).toContain("theme={theme === 'vs-dark' ? oneDark : 'light'}");
    expect(source).toContain('data-cold-code-editor="codemirror"');
    expect(source).toContain('data-cold-code-editor-theme={theme}');
    expect(source).toContain("data-cold-code-editor-loading={loading ? 'true' : 'false'}");
    expect(source).toContain('data-cold-code-editor-loading-state="angular-nz-code-editor-loading"');
    expect(source).toContain("data-cold-code-editor-folding={folding ? 'true' : 'false'}");
    expect(source).toContain("data-cold-code-editor-automatic-layout={automaticLayout ? 'true' : 'false'}");
    expect(source).toContain('data-cold-code-editor-license="codemirror-mit"');
    expect(source).not.toContain('<textarea');

    const { ColdCodeEditor } = await import('./cold-code-editor');
    const html = renderToStaticMarkup(
      <ColdCodeEditor
        data-testid="cold-code-editor"
        language="yaml"
        value={'apiVersion: hertzbeat/v1\nkind: service'}
        readOnly
        onChange={vi.fn()}
      />
    );

    expect(html).toContain('data-cold-code-editor="codemirror"');
    expect(html).toContain('data-cold-code-editor-language="yaml"');
    expect(html).toContain('data-cold-code-editor-theme="vs-dark"');
    expect(html).toContain('data-cold-code-editor-loading="false"');
    expect(html).toContain('data-cold-code-editor-loading-owner="cold-code-editor"');
    expect(html).toContain('data-cold-code-editor-folding="true"');
    expect(html).toContain('data-cold-code-editor-automatic-layout="true"');
    expect(html).toContain('data-cold-code-editor-readonly="true"');
    expect(html).toContain('data-cold-code-editor-license="codemirror-mit"');
    expect(html).toContain('data-mocked-codemirror="true"');
    expect(html).toContain('data-editable="false"');
    expect(html).toContain('data-theme="custom-dark"');
    expect(html).toContain('apiVersion: hertzbeat/v1');
    expect(html).not.toContain('data-cold-code-editor-loading-state="angular-nz-code-editor-loading"');
  });

  it('can expose the Angular light editor theme contract', async () => {
    const { ColdCodeEditor } = await import('./cold-code-editor');
    const html = renderToStaticMarkup(
      <ColdCodeEditor
        data-testid="cold-code-editor-light"
        language="yaml"
        theme="vs"
        value="app: mysql"
        onChange={vi.fn()}
      />
    );

    expect(html).toContain('data-cold-code-editor-theme="vs"');
    expect(html).toContain('data-theme="light"');
  });

  it('lets routes surface disabled folding and automatic layout contracts when needed', async () => {
    const { ColdCodeEditor } = await import('./cold-code-editor');
    const html = renderToStaticMarkup(
      <ColdCodeEditor
        data-testid="cold-code-editor-options"
        language="yaml"
        value="app: custom"
        folding={false}
        automaticLayout={false}
        onChange={vi.fn()}
      />
    );

    expect(html).toContain('data-cold-code-editor-folding="false"');
    expect(html).toContain('data-cold-code-editor-automatic-layout="false"');
  });

  it('mirrors the Angular nz-code-editor loading contract', async () => {
    const { ColdCodeEditor } = await import('./cold-code-editor');
    const html = renderToStaticMarkup(
      <ColdCodeEditor
        data-testid="cold-code-editor-loading"
        language="yaml"
        value="app: loading"
        loading
        loadingLabel="Loading template YAML"
        onChange={vi.fn()}
      />
    );

    expect(html).toContain('data-cold-code-editor-loading="true"');
    expect(html).toContain('data-cold-code-editor-loading-owner="cold-code-editor"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('data-cold-code-editor-readonly="true"');
    expect(html).toContain('data-readonly="true"');
    expect(html).toContain('data-editable="false"');
    expect(html).toContain('data-cold-code-editor-loading-state="angular-nz-code-editor-loading"');
    expect(html).toContain('data-cold-code-editor-loading-state-owner="cold-code-editor"');
    expect(html).toContain('Loading template YAML');
  });
});
