import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value, readOnly, extensions, height, basicSetup, theme, onChange, ...props }: any) => (
    <div
      data-testid={props['data-testid']}
      data-mocked-codemirror="true"
      data-readonly={readOnly ? 'true' : 'false'}
      data-height={height}
      data-basic-setup={basicSetup ? 'true' : 'false'}
      data-theme={theme ? 'custom-dark' : 'missing'}
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
    expect(source).toContain('theme={oneDark}');
    expect(source).toContain('data-cold-code-editor="codemirror"');
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
    expect(html).toContain('data-cold-code-editor-readonly="true"');
    expect(html).toContain('data-cold-code-editor-license="codemirror-mit"');
    expect(html).toContain('data-mocked-codemirror="true"');
    expect(html).toContain('data-theme="custom-dark"');
    expect(html).toContain('apiVersion: hertzbeat/v1');
  });
});
