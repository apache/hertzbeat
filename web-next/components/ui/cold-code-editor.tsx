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

export type ColdCodeEditorLanguage = 'yaml' | 'json' | 'html' | 'javascript' | 'shell' | 'text';

export type ColdCodeEditorProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> & {
  value: string;
  onChange?: (value: string) => void;
  language?: ColdCodeEditorLanguage;
  readOnly?: boolean;
  height?: string;
  minHeight?: string;
  placeholder?: string;
  name?: string;
  ariaLabel?: string;
};

const coldCodeEditorTheme = EditorView.theme({
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

function getLanguageExtension(language: ColdCodeEditorLanguage): Extension | null {
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

export function ColdCodeEditor({
  value,
  onChange,
  language = 'text',
  readOnly = false,
  height,
  minHeight = '220px',
  placeholder,
  name,
  ariaLabel,
  className,
  style,
  ...props
}: ColdCodeEditorProps) {
  const extensions = useMemo(() => {
    const languageExtension = getLanguageExtension(language);
    return [
      basicSetup,
      coldCodeEditorTheme,
      EditorView.lineWrapping,
      ...(languageExtension ? [languageExtension] : []),
      ...(readOnly ? [EditorState.readOnly.of(true)] : [])
    ];
  }, [language, readOnly]);

  return (
    <div
      {...props}
      data-cold-code-editor="codemirror"
      data-cold-code-editor-language={language}
      data-cold-code-editor-readonly={readOnly ? 'true' : undefined}
      data-cold-code-editor-license="codemirror-mit"
      className={cn('min-w-0 overflow-hidden rounded-[3px]', className)}
      style={{ minHeight, ...style }}
    >
      {name ? <HiddenInput name={name} value={value} data-cold-code-editor-value="hidden" /> : null}
      <CodeMirror
        value={value}
        height={height}
        minHeight={minHeight}
        placeholder={placeholder}
        basicSetup={false}
        theme={oneDark}
        extensions={extensions}
        readOnly={readOnly}
        editable={!readOnly}
        aria-label={ariaLabel}
        onChange={nextValue => onChange?.(nextValue)}
      />
    </div>
  );
}
