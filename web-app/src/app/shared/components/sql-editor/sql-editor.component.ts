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

  /**
   * SQL Security Validator - Simple regex-based validation
   * Mirrors backend SqlSecurityValidator security policy:
   * 1. Only SELECT statements are allowed
   * 2. Table must be in whitelist
   * 3. Dangerous patterns (subqueries, UNION, CTE) are blocked
   * Note: This is for UX feedback only, real security is enforced by backend
   */
  private validateSql(sql: string): SqlValidationError[] {
    const errors: SqlValidationError[] = [];
    if (!sql || !sql.trim()) {
      return errors;
    }

    const lines = sql.split('\n');
    const lastLine = lines.length;
    const lastCol = lines[lastLine - 1].length + 1;

    // Remove string literals and comments to avoid false positives
    const sanitizedSql = this.removeStringsAndComments(sql);
    const upperSql = sanitizedSql.toUpperCase().trim();

    // Helper to create error
    const addError = (message: string) => {
      errors.push({
        message,
        startLine: 1,
        startColumn: 1,
        endLine: lastLine,
        endColumn: lastCol
      });
    };

    // 1. Must start with SELECT
    if (!upperSql.startsWith('SELECT')) {
      addError('Only SELECT statements are allowed');
      return errors;
    }

    // 2. Check for dangerous statements
    const dangerousPatterns = [
      { pattern: /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE)\b/i, message: 'Only SELECT statements are allowed' },
      { pattern: /\bUNION\b/i, message: 'UNION is not allowed' },
      { pattern: /\bINTERSECT\b/i, message: 'INTERSECT is not allowed' },
      { pattern: /\bEXCEPT\b/i, message: 'EXCEPT is not allowed' },
      { pattern: /^\s*WITH\b/i, message: 'CTE (WITH clause) is not allowed' }
    ];

    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(sanitizedSql)) {
        addError(message);
        return errors;
      }
    }

    // 3. Check for subqueries (SELECT inside parentheses, but not in function calls)
    if (this.hasSubquery(sanitizedSql)) {
      addError('Subqueries are not allowed');
      return errors;
    }

    // 4. Must have FROM clause
    if (!/\bFROM\b/i.test(sanitizedSql)) {
      addError('SQL query must contain FROM clause');
      return errors;
    }

    // 5. Validate table name
    const tableMatch = sanitizedSql.match(/\bFROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
    if (tableMatch) {
      const tableName = tableMatch[1];
      if (tableName.toLowerCase() !== this.tableName.toLowerCase()) {
        addError(`Access to table '${tableName}' is not allowed. Allowed table: ${this.tableName}`);
      }
    }

    // 6. Basic syntax checks
    const openParens = (sanitizedSql.match(/\(/g) || []).length;
    const closeParens = (sanitizedSql.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      addError('Mismatched parentheses');
    }

    return errors;
  }

  /**
   * Remove string literals and comments to avoid false positives in pattern matching
   */
  private removeStringsAndComments(sql: string): string {
    return (
      sql
        // Remove single-quoted strings (handle escaped quotes)
        .replace(/'(?:[^'\\]|\\.)*'/g, "''")
        // Remove double-quoted strings
        .replace(/"(?:[^"\\]|\\.)*"/g, '""')
        // Remove single-line comments
        .replace(/--.*$/gm, '')
        // Remove multi-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
    );
  }

  /**
   * Check for subqueries (nested SELECT statements)
   * Detects SELECT inside parentheses that's not part of IN(...values...)
   */
  private hasSubquery(sql: string): boolean {
    // Pattern to detect SELECT inside parentheses
    const subqueryPattern = /\(\s*SELECT\b/i;
    return subqueryPattern.test(sql);
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
