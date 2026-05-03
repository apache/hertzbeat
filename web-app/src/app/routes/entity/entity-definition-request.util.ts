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
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { EntityDefinitionFormat, EntityDefinitionRequest } from '../../pojo/EntityDefinition';

export function normalizeDefinitionRequest(format: EntityDefinitionFormat, content: string): EntityDefinitionRequest {
  const normalized = new EntityDefinitionRequest();
  if (format !== 'curl') {
    normalized.format = format;
    normalized.content = content;
    return normalized;
  }
  const extracted = extractDefinitionRequestFromCurl(content);
  if (extracted != null) {
    return extracted;
  }
  normalized.format = format;
  normalized.content = content;
  return normalized;
}

export function extractDefinitionRequestFromCurl(command: string): EntityDefinitionRequest | undefined {
  const dataArgument = matchCurlDataArgument(command);
  if (dataArgument == null) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(shellUnquote(dataArgument));
    if (parsed == null || typeof parsed !== 'object') {
      return undefined;
    }
    const nextRequest = new EntityDefinitionRequest();
    if (typeof parsed.format === 'string') {
      nextRequest.format = parsed.format as EntityDefinitionFormat | 'auto';
    }
    if (typeof parsed.content === 'string') {
      nextRequest.content = parsed.content;
      return nextRequest;
    }
    if (parsed.apiVersion != null || parsed.kind != null || parsed.metadata != null || parsed.spec != null) {
      nextRequest.format = 'json';
      nextRequest.content = JSON.stringify(parsed, null, 2);
      return nextRequest;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function matchCurlDataArgument(command: string): string | undefined {
  const pattern = /(?:^|\s)(?:--data-raw|--data-binary|--data|-d)\s+('(?:[^']|'\\''|\\')*'|"(?:[^"\\]|\\.|\\\n|\\\r\n)*")/s;
  return command.match(pattern)?.[1];
}

function shellUnquote(value: string): string {
  if (value.length < 2) {
    return value;
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/'\\''/g, "'");
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    const inner = value.slice(1, -1);
    return inner
      .replace(/\\\r?\n/g, '')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
  return value;
}
