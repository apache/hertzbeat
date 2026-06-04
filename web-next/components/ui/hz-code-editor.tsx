'use client';

import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { basicSetup } from 'codemirror';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import { EditorState, type Extension } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { cn } from '../../lib/utils';
import { HiddenInput } from './hidden-input';

export type HzCodeEditorLanguage = 'yaml' | 'json' | 'html' | 'javascript' | 'shell' | 'text';
export type HzCodeEditorTheme = 'vs' | 'vs-dark';

export type HzCodeEditorProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  value: string;
  onChange?: (value: string) => void;
  language?: HzCodeEditorLanguage;
  theme?: HzCodeEditorTheme;
  readOnly?: boolean;
  loading?: boolean;
  loadingLabel?: React.ReactNode;
  folding?: boolean;
  automaticLayout?: boolean;
  height?: string;
  minHeight?: string;
  placeholder?: string;
  name?: string;
  ariaLabel?: string;
};

const hzCodeEditorTheme = EditorView.theme({
  '&': {
    backgroundColor: '#101217',
    color: '#dbe4f0',
    border: '1px solid #2b3039',
    borderRadius: '3px',
    fontSize: '12px',
    minHeight: 'inherit'
  },
  '&.cm-focused': {
    borderColor: '#4e74f8',
    outline: '2px solid rgba(78,116,248,0.12)'
  },
  '.cm-scroller': {
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    lineHeight: '1.6',
    minHeight: 'inherit'
  },
  '.cm-content': {
    padding: '8px 0',
    caretColor: '#f8fafc',
    minHeight: 'inherit'
  },
  '.cm-line': {
    padding: '0 12px'
  },
  '.cm-gutters': {
    backgroundColor: '#0b0c0e',
    borderRight: '1px solid #252b34',
    color: '#6f7787'
  },
  '.cm-activeLine': {
    backgroundColor: '#151b28'
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#151b28',
    color: '#dbe4f0'
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(78,116,248,0.34)'
  },
  '.cm-placeholder': {
    color: '#858d9a'
  }
}, {
  dark: true
});

const hzCodeEditorLightTheme = EditorView.theme({
  '&': {
    backgroundColor: '#f8fafc',
    color: '#111827',
    border: '1px solid #cbd5e1',
    borderRadius: '3px',
    fontSize: '12px',
    minHeight: 'inherit'
  },
  '&.cm-focused': {
    borderColor: '#4e74f8',
    outline: '2px solid rgba(78,116,248,0.14)'
  },
  '.cm-scroller': {
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    lineHeight: '1.6',
    minHeight: 'inherit'
  },
  '.cm-content': {
    padding: '8px 0',
    caretColor: '#1f2937',
    minHeight: 'inherit'
  },
  '.cm-line': {
    padding: '0 12px'
  },
  '.cm-gutters': {
    backgroundColor: '#eef2f7',
    borderRight: '1px solid #cbd5e1',
    color: '#64748b'
  },
  '.cm-activeLine': {
    backgroundColor: '#e8f0ff'
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#e8f0ff',
    color: '#1f2937'
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(78,116,248,0.24)'
  },
  '.cm-placeholder': {
    color: '#64748b'
  }
}, {
  dark: false
});

function getLanguageExtension(language: HzCodeEditorLanguage): Extension | null {
  switch (language) {
    case 'yaml':
      return yaml();
    case 'json':
      return json();
    case 'html':
      return html();
    case 'javascript':
      return javascript();
    case 'shell':
    case 'text':
    default:
      return null;
  }
}

export function HzCodeEditor({
  value,
  onChange,
  language = 'text',
  theme = 'vs-dark',
  readOnly = false,
  loading = false,
  loadingLabel = 'Loading editor',
  folding = true,
  automaticLayout = true,
  height,
  minHeight = '220px',
  placeholder,
  name,
  ariaLabel,
  className,
  style,
  ...props
}: HzCodeEditorProps) {
  const extensions = useMemo(() => {
    const languageExtension = getLanguageExtension(language);
    const themeExtension = theme === 'vs-dark' ? hzCodeEditorTheme : hzCodeEditorLightTheme;
    return [
      basicSetup,
      themeExtension,
      EditorView.lineWrapping,
      ...(languageExtension ? [languageExtension] : []),
      ...(readOnly || loading ? [EditorState.readOnly.of(true)] : [])
    ];
  }, [language, loading, readOnly, theme]);

  return (
    <div
      {...props}
      data-hz-code-editor="codemirror"
      data-hz-code-editor-language={language}
      data-hz-code-editor-theme={theme}
      data-hz-code-editor-loading={loading ? 'true' : 'false'}
      data-hz-code-editor-loading-owner="hz-code-editor"
      data-hz-code-editor-folding={folding ? 'true' : 'false'}
      data-hz-code-editor-automatic-layout={automaticLayout ? 'true' : 'false'}
      data-hz-code-editor-readonly={readOnly || loading ? 'true' : undefined}
      data-hz-code-editor-license="codemirror-mit"
      aria-busy={loading ? 'true' : undefined}
      className={cn('relative min-w-0 overflow-hidden rounded-[3px]', className)}
      style={{ minHeight, ...style }}
    >
      {name ? <HiddenInput name={name} value={value} data-hz-code-editor-value="hidden" /> : null}
      <CodeMirror
        value={value}
        height={height}
        minHeight={minHeight}
        placeholder={placeholder}
        basicSetup={false}
        theme={theme === 'vs-dark' ? oneDark : 'light'}
        extensions={extensions}
        readOnly={readOnly || loading}
        editable={!readOnly && !loading}
        aria-label={ariaLabel}
        onChange={nextValue => onChange?.(nextValue)}
      />
      {loading ? (
        <div
          data-hz-code-editor-loading-state="angular-nz-code-editor-loading"
          data-hz-code-editor-loading-state-owner="hz-code-editor"
          className="absolute inset-0 flex items-center justify-center bg-[#0b0c0e]/72 text-[12px] font-semibold text-[#dbe4f0] backdrop-blur-[1px]"
        >
          {loadingLabel}
        </div>
      ) : null}
    </div>
  );
}
