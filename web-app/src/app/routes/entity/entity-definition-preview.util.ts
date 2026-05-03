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

export type EntityDefinitionPreviewFormat = 'yaml' | 'json' | 'curl';

export function renderDefinitionPreviewHtml(content: string, format: EntityDefinitionPreviewFormat): string {
  return content
    .split('\n')
    .map(line => {
      switch (format) {
        case 'json':
          return renderJsonLine(line);
        case 'curl':
          return renderCurlLine(line);
        default:
          return renderYamlLine(line);
      }
    })
    .join('\n');
}

function renderJsonLine(line: string): string {
  const leadingWhitespace = line.match(/^\s*/)?.[0] || '';
  const trimmed = line.trim();
  if (trimmed === '') {
    return '';
  }

  if (/^[\[\]{}],?$/.test(trimmed)) {
    return `${escapeHtml(leadingWhitespace)}${token('punctuation', trimmed)}`;
  }

  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) {
    return `${escapeHtml(leadingWhitespace)}${token('plain', trimmed)}`;
  }

  const keyPart = line.slice(0, colonIndex);
  const valuePart = line.slice(colonIndex + 1);
  const keyWhitespace = keyPart.match(/^\s*/)?.[0] || '';
  const key = keyPart.trim();
  return `${escapeHtml(keyWhitespace)}${token('key', key)}${token('punctuation', ':')}${renderJsonValue(valuePart)}`;
}

function renderJsonValue(valuePart: string): string {
  const leadingWhitespace = valuePart.match(/^\s*/)?.[0] || '';
  const trimmed = valuePart.trim();
  if (trimmed === '') {
    return '';
  }

  let suffix = '';
  let coreValue = trimmed;
  if (coreValue.endsWith(',')) {
    suffix = ',';
    coreValue = coreValue.slice(0, -1).trimEnd();
  }

  let rendered = '';
  if (/^[\[{]$/.test(coreValue)) {
    rendered = token('punctuation', coreValue);
  } else if (/^".*"$/.test(coreValue)) {
    rendered = token('string', coreValue);
  } else if (/^(true|false|null)$/.test(coreValue)) {
    rendered = token('literal', coreValue);
  } else if (/^-?\d+(\.\d+)?$/.test(coreValue)) {
    rendered = token('number', coreValue);
  } else {
    rendered = token('plain', coreValue);
  }

  return `${escapeHtml(leadingWhitespace)}${rendered}${suffix ? token('punctuation', suffix) : ''}`;
}

function renderYamlLine(line: string): string {
  const leadingWhitespace = line.match(/^\s*/)?.[0] || '';
  const trimmed = line.trim();
  if (trimmed === '') {
    return '';
  }

  if (trimmed.startsWith('- ')) {
    return `${escapeHtml(leadingWhitespace)}${token('punctuation', '-')}` + ` ${renderYamlPair(trimmed.slice(2))}`;
  }

  return `${escapeHtml(leadingWhitespace)}${renderYamlPair(trimmed)}`;
}

function renderYamlPair(text: string): string {
  const colonIndex = text.indexOf(':');
  if (colonIndex === -1) {
    return renderScalar(text);
  }

  const key = text.slice(0, colonIndex).trim();
  const value = text.slice(colonIndex + 1);
  return `${token('key', key)}${token('punctuation', ':')}${renderYamlValue(value)}`;
}

function renderYamlValue(value: string): string {
  const leadingWhitespace = value.match(/^\s*/)?.[0] || '';
  const trimmed = value.trim();
  if (trimmed === '') {
    return '';
  }

  return `${escapeHtml(leadingWhitespace)}${renderScalar(trimmed)}`;
}

function renderScalar(value: string): string {
  if (/^".*"$/.test(value)) {
    return token('string', value);
  }
  if (/^(true|false|null)$/.test(value)) {
    return token('literal', value);
  }
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return token('number', value);
  }
  return token('plain', value);
}

function renderCurlLine(line: string): string {
  const tokens = line.match(/'[^']*'|"[^"]*"|\S+/g) || [];
  const renderedTokens = tokens.map(item => {
    if (item === 'curl') {
      return token('keyword', item);
    }
    if (item.startsWith('-')) {
      return token('flag', item);
    }
    if ((item.startsWith("'") && item.endsWith("'")) || (item.startsWith('"') && item.endsWith('"'))) {
      return token('string', item);
    }
    return token('plain', item);
  });
  return renderedTokens.join(' ');
}

function token(type: string, value: string): string {
  return `<span class="definition-token definition-token-${type}">${escapeHtml(value)}</span>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
