/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Component, EventEmitter, forwardRef, Input, OnDestroy, Output } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

declare const monaco: any;

export interface SqlValidationError {
  message: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface LogTableColumn {
  name: string;
  type: string;
  description?: string;
}

@Component({
  selector: 'app-sql-editor',
  templateUrl: './sql-editor.component.html',
  styleUrls: ['./sql-editor.component.less'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SqlEditorComponent),
      multi: true
    }
  ]
})
export class SqlEditorComponent implements OnDestroy, ControlValueAccessor {
  @Input() height: string = '120px';
  @Input() tableName: string = 'hertzbeat_logs';

  @Output() readonly editorInit = new EventEmitter<any>();
  @Output() readonly validationChange = new EventEmitter<SqlValidationError[]>();

  code: string = '';
  private editorInstance: any;
  private validationTimeout: any;
  editorOption: any = {
    language: 'sql',
    theme: 'vs',
    minimap: { enabled: false },
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    folding: false,
    wordWrap: 'on',
    fontSize: 13,
    tabSize: 2,
    suggestOnTriggerCharacters: true,
    quickSuggestions: true,
    wordBasedSuggestions: false,
    fixedOverflowWidgets: true,
    overviewRulerLanes: 0
  };

  private completionProvider: any;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  private readonly LOG_TABLE_COLUMNS: LogTableColumn[] = [
    { name: 'time_unix_nano', type: 'TimestampNanosecond', description: 'Log timestamp in nanoseconds' },
    { name: 'observed_time_unix_nano', type: 'TimestampNanosecond', description: 'Observed timestamp in nanoseconds' },
    { name: 'severity_number', type: 'Int32', description: 'Severity level number (1-24)' },
    { name: 'severity_text', type: 'String', description: 'Severity text (DEBUG, INFO, WARN, ERROR, etc.)' },
    { name: 'body', type: 'Json', description: 'Log message body content' },
    { name: 'trace_id', type: 'String', description: 'Distributed tracing trace ID' },
    { name: 'span_id', type: 'String', description: 'Distributed tracing span ID' },
    { name: 'trace_flags', type: 'Int32', description: 'Trace flags' },
    { name: 'attributes', type: 'Json', description: 'Log attributes as JSON' },
    { name: 'resource', type: 'Json', description: 'Resource information as JSON' },
    { name: 'instrumentation_scope', type: 'Json', description: 'Instrumentation scope information' },
    { name: 'dropped_attributes_count', type: 'Int32', description: 'Number of dropped attributes' }
  ];

  ngOnDestroy(): void {
    if (this.completionProvider) {
      this.completionProvider.dispose();
    }
    if (this.validationTimeout) {
      clearTimeout(this.validationTimeout);
    }
  }

  onEditorInit(editor: any): void {
    this.editorInstance = editor;
    this.registerCompletionProvider();
    this.configureSuggestWidget(editor);
    this.editorInit.emit(editor);
  }

  private configureSuggestWidget(editor: any): void {
    if (typeof monaco === 'undefined') {
      return;
    }
    try {
      editor.updateOptions({
        suggest: {
          maxVisibleSuggestions: 8,
          showStatusBar: false,
          preview: false
        }
      });
    } catch (e) {
      console.warn('Failed to configure suggest widget:', e);
    }
  }

  writeValue(value: string): void {
    this.code = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  onCodeChange(value: string): void {
    this.code = value;
    this.onChange(value);
    this.onTouched();
    this.validateSqlWithDebounce(value);
  }

  private validateSqlWithDebounce(sql: string): void {
    if (this.validationTimeout) {
      clearTimeout(this.validationTimeout);
    }
    this.validationTimeout = setTimeout(() => {
      const errors = this.validateSql(sql);
      this.setEditorMarkers(errors);
      this.validationChange.emit(errors);
    }, 500);
  }

  private validateSql(sql: string): SqlValidationError[] {
    const errors: SqlValidationError[] = [];
    if (!sql || !sql.trim()) {
      return errors;
    }

    const upperSql = sql.toUpperCase().trim();
    const lines = sql.split('\n');

    if (!upperSql.startsWith('SELECT')) {
      errors.push({
        message: 'SQL query must start with SELECT',
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: Math.min(sql.indexOf(' ') + 1 || sql.length, lines[0].length + 1)
      });
    }

    if (!upperSql.includes('FROM')) {
      const lastLine = lines.length;
      const lastLineLength = lines[lastLine - 1].length;
      errors.push({
        message: 'SQL query must contain FROM clause',
        startLine: lastLine,
        startColumn: 1,
        endLine: lastLine,
        endColumn: lastLineLength + 1
      });
    }

    if (upperSql.includes('FROM')) {
      const tablePattern = new RegExp(`FROM\\s+${this.tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
      if (!tablePattern.test(sql)) {
        const fromIndex = upperSql.indexOf('FROM');
        let lineNum = 1;
        let colNum = 1;
        let charCount = 0;
        for (let i = 0; i < lines.length; i++) {
          if (charCount + lines[i].length >= fromIndex) {
            lineNum = i + 1;
            colNum = fromIndex - charCount + 1;
            break;
          }
          charCount += lines[i].length + 1;
        }
        errors.push({
          message: `Table must be '${this.tableName}'`,
          startLine: lineNum,
          startColumn: colNum,
          endLine: lineNum,
          endColumn: colNum + 20
        });
      }
    }

    const openParens = (sql.match(/\(/g) || []).length;
    const closeParens = (sql.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push({
        message: 'Mismatched parentheses',
        startLine: 1,
        startColumn: 1,
        endLine: lines.length,
        endColumn: lines[lines.length - 1].length + 1
      });
    }

    const quotes = (sql.match(/'/g) || []).length;
    if (quotes % 2 !== 0) {
      errors.push({
        message: 'Unclosed string literal (missing quote)',
        startLine: 1,
        startColumn: 1,
        endLine: lines.length,
        endColumn: lines[lines.length - 1].length + 1
      });
    }

    return errors;
  }

  private setEditorMarkers(errors: SqlValidationError[]): void {
    if (typeof monaco === 'undefined' || !this.editorInstance) {
      return;
    }

    const model = this.editorInstance.getModel();
    if (!model) {
      return;
    }

    const markers = errors.map(error => ({
      severity: monaco.MarkerSeverity.Error,
      message: error.message,
      startLineNumber: error.startLine,
      startColumn: error.startColumn,
      endLineNumber: error.endLine,
      endColumn: error.endColumn
    }));

    monaco.editor.setModelMarkers(model, 'sql-validator', markers);
  }

  private registerCompletionProvider(): void {
    if (typeof monaco === 'undefined') {
      return;
    }

    if (this.completionProvider) {
      this.completionProvider.dispose();
    }

    this.completionProvider = monaco.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: [' ', '.', ',', '(', '\n'],
      provideCompletionItems: (model: any, position: any) => {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });

        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        const suggestions: any[] = [];
        const upperText = textUntilPosition.toUpperCase();

        const isAfterFrom = /FROM\s+$/i.test(textUntilPosition) || /FROM\s+\w*$/i.test(textUntilPosition);
        const isAfterSelect = /SELECT\s+$/i.test(textUntilPosition) || /SELECT\s+.*,\s*$/i.test(textUntilPosition);
        const isAfterWhere =
          /WHERE\s+$/i.test(textUntilPosition) || /AND\s+$/i.test(textUntilPosition) || /OR\s+$/i.test(textUntilPosition);
        const hasTableContext = new RegExp(this.tableName, 'i').test(textUntilPosition);
        const isEmpty = !textUntilPosition.trim();

        // Empty or start - show templates first
        if (isEmpty) {
          suggestions.push({
            label: `SELECT * FROM ${this.tableName}`,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: `SELECT * FROM ${this.tableName} WHERE $0`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: 'Query template',
            sortText: '0',
            range: range
          });
          suggestions.push({
            label: `SELECT COUNT(*) FROM ${this.tableName}`,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE $0`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: 'Count template',
            sortText: '1',
            range: range
          });
        }

        // After FROM - only show table name
        if (isAfterFrom) {
          suggestions.push({
            label: this.tableName,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: this.tableName,
            detail: 'Log table',
            sortText: '0',
            range: range
          });
          return { suggestions };
        }

        // After SELECT - show columns and *
        if (isAfterSelect) {
          suggestions.push({
            label: '*',
            kind: monaco.languages.CompletionItemKind.Operator,
            insertText: '*',
            detail: 'All columns',
            sortText: '0',
            range: range
          });
          this.LOG_TABLE_COLUMNS.forEach((column, idx) => {
            suggestions.push({
              label: column.name,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: column.name,
              detail: column.type,
              sortText: `1${idx}`,
              range: range
            });
          });
          return { suggestions };
        }

        // After WHERE/AND/OR - show columns for conditions
        if (isAfterWhere || hasTableContext) {
          this.LOG_TABLE_COLUMNS.forEach((column, idx) => {
            suggestions.push({
              label: column.name,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: column.name,
              detail: column.type,
              sortText: `0${idx}`,
              range: range
            });
          });
        }

        // Show relevant keywords based on context
        const keywordsToShow = this.getContextKeywords(upperText);
        keywordsToShow.forEach((keyword, idx) => {
          suggestions.push({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            detail: 'SQL',
            sortText: `2${idx}`,
            range: range
          });
        });

        return { suggestions };
      }
    });
  }

  private getContextKeywords(upperText: string): string[] {
    if (!upperText.includes('SELECT')) {
      return ['SELECT'];
    }
    if (!upperText.includes('FROM')) {
      return ['FROM'];
    }
    if (!upperText.includes('WHERE') && upperText.includes('FROM')) {
      return ['WHERE', 'ORDER BY', 'LIMIT', 'GROUP BY'];
    }
    if (upperText.includes('WHERE')) {
      return ['AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS NULL', 'IS NOT NULL', 'ORDER BY', 'LIMIT', 'GROUP BY'];
    }
    return ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER BY', 'LIMIT'];
  }
}
