/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { appendCalculatedExtraction, updateCalculatedExtraction } from '../model/explore-log-calculated-v2';
import type { ExtractionEditorParams } from './calculated-extraction-editor-contract';
type Params = ExtractionEditorParams;

export function generateExtraction(engine: 'regex' | 'grok', sample: string, source: string) {
  if (!sample.trim()) return undefined;
  const multiline = /[\r\n]/u.test(sample);
  if (engine === 'grok' && multiline) return undefined;
  const name = captureName(source);
  let matcher: { grok: string; regex: string };
  if (/^[+-]?[0-9]+$/u.test(sample)) matcher = { grok: 'integer', regex: '[+-]?[0-9]+' };
  else if (/^[+-]?(?:[0-9]+\.[0-9]*|\.[0-9]+)$/u.test(sample)) {
    matcher = { grok: 'number', regex: '[+-]?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)' };
  } else if (/\s/u.test(sample)) matcher = { grok: 'data', regex: multiline ? '[\\s\\S]+' : '.+' };
  else matcher = { grok: 'notSpace', regex: '\\S+' };
  return {
    name,
    pattern: engine === 'grok' ? `^%{${matcher.grok}:${name}}$` : `^(?<${name}>${matcher.regex})$`
  };
}

function captureName(source: string) {
  const value = source === 'builtin:body' ? 'extracted_value' : source.slice(source.indexOf(':') + 1);
  const name = value.replace(/[^A-Za-z0-9_]/gu, '_');
  return /^[A-Za-z]/u.test(name) ? name.slice(0, 64) : `field_${name}`.slice(0, 64);
}

export function captureNames(engine: 'regex' | 'grok', pattern: string) {
  return engine === 'grok' ? grokCaptureNames(pattern) : regexCaptureNames(pattern);
}

function grokCaptureNames(pattern: string) {
  const names: string[] = [];
  let position = 0;
  while (true) {
    const start = pattern.indexOf('%{', position);
    if (start < 0) return names;
    const end = pattern.indexOf('}', start + 2);
    if (end < 0) return [];
    const capture = pattern.slice(start + 2, end).split(':');
    const name = capture.length === 2 ? capture[1] : undefined;
    if (!name || !validCaptureName(name)) return [];
    names.push(name);
    position = end + 1;
  }
}

function regexCaptureNames(pattern: string) {
  const names: string[] = [];
  let inClass = false;
  for (let index = 0; index < pattern.length; index++) {
    const value = pattern[index];
    if (value === '\\') {
      index++;
    } else if (value === '[' && !inClass) {
      inClass = true;
    } else if (value === ']' && inClass) {
      inClass = false;
    } else if (!inClass && pattern.startsWith('(?<', index)) {
      const end = pattern.indexOf('>', index + 3);
      if (end < 0) return [];
      const name = pattern.slice(index + 3, end);
      if (!validCaptureName(name)) return [];
      names.push(name);
      index = end;
    }
  }
  return names;
}

function validCaptureName(name: string) {
  return /^[A-Za-z][A-Za-z0-9_]{0,63}$/u.test(name);
}

export function extractionCandidate(
  params: Params,
  engine: 'regex' | 'grok',
  source: string,
  pattern: string,
  names: string[]
) {
  return params.editingId
    ? updateCalculatedExtraction(
        params.raw,
        params.editingId,
        engine,
        source,
        pattern,
        names,
        params.search,
        params.sort,
        params.analysis
      )
    : appendCalculatedExtraction(params.raw, engine, source, pattern, names);
}
