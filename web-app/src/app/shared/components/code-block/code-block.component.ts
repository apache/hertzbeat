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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import ini from 'highlight.js/lib/languages/ini';
import java from 'highlight.js/lib/languages/java';
import json from 'highlight.js/lib/languages/json';
import plaintext from 'highlight.js/lib/languages/plaintext';
import shell from 'highlight.js/lib/languages/shell';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

type CodeBlockVariant = 'minimal' | 'editor-card' | 'inline-token';
type CopyState = 'idle' | 'done' | 'error';

let registered = false;

@Component({
  standalone: false,  selector: 'app-code-block',
  templateUrl: './code-block.component.html',
  styleUrls: ['./code-block.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CodeBlockComponent implements OnChanges {
  @Input() code = '';
  @Input() language = 'text';
  @Input() maxHeight = '680px';
  @Input() variant: CodeBlockVariant = 'minimal';
  @Input() title = '';

  highlightedCode = '';
  copyState: CopyState = 'idle';

  private copyTimer?: ReturnType<typeof setTimeout>;

  constructor(private cdr: ChangeDetectorRef) {
    this.registerLanguages();
    this.refreshHighlightedCode();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['code'] || changes['language']) {
      this.refreshHighlightedCode();
    }
  }

  get normalizedLanguage(): string {
    const normalized = (this.language || 'text').trim().toLowerCase();
    if (normalized === 'curl' || normalized === 'sh') {
      return 'bash';
    }
    if (normalized === 'text') {
      return 'plaintext';
    }
    if (normalized === 'properties') {
      return 'ini';
    }
    if (normalized === '') {
      return 'plaintext';
    }
    return normalized;
  }

  get displayLanguageLabel(): string {
    const language = this.normalizedLanguage;
    const labels: Record<string, string> = {
      bash: 'Shell',
      ini: 'INI',
      json: 'JSON',
      plaintext: 'Text',
      shell: 'Shell',
      sql: 'SQL',
      typescript: 'TypeScript',
      xml: 'XML',
      yaml: 'YAML'
    };
    return labels[language] ?? language.toUpperCase();
  }

  get shouldShowHeader(): boolean {
    return this.variant !== 'inline-token' || !!this.title;
  }

  get contentMaxHeight(): string {
    return this.maxHeight || '680px';
  }

  async copyCode(): Promise<void> {
    const text = this.code || '';
    if (!text) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        this.fallbackCopy(text);
      }
      this.setCopyState('done');
    } catch {
      try {
        this.fallbackCopy(text);
        this.setCopyState('done');
      } catch {
        this.setCopyState('error');
      }
    }
  }

  private refreshHighlightedCode(): void {
    const source = this.code || '';
    const language = this.normalizedLanguage;

    try {
      if (source.trim() === '') {
        this.highlightedCode = '';
        return;
      }
      if (hljs.getLanguage(language)) {
        this.highlightedCode = hljs.highlight(source, { language, ignoreIllegals: true }).value;
        return;
      }
      this.highlightedCode = hljs.highlightAuto(source).value;
    } catch {
      this.highlightedCode = hljs.highlight(source, { language: 'plaintext', ignoreIllegals: true }).value;
    }
  }

  private registerLanguages(): void {
    if (registered) {
      return;
    }
    hljs.registerLanguage('bash', bash);
    hljs.registerLanguage('ini', ini);
    hljs.registerLanguage('java', java);
    hljs.registerLanguage('json', json);
    hljs.registerLanguage('plaintext', plaintext);
    hljs.registerLanguage('shell', shell);
    hljs.registerLanguage('sql', sql);
    hljs.registerLanguage('typescript', typescript);
    hljs.registerLanguage('xml', xml);
    hljs.registerLanguage('yaml', yaml);
    registered = true;
  }

  private setCopyState(state: CopyState): void {
    this.copyState = state;
    if (this.copyTimer) {
      clearTimeout(this.copyTimer);
    }
    if (state !== 'idle') {
      this.copyTimer = setTimeout(() => {
        this.copyState = 'idle';
        this.cdr.markForCheck();
      }, 1600);
    }
    this.cdr.markForCheck();
  }

  private fallbackCopy(text: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}
