/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { GuideRenderResponse, GuideSnippet, SecretPlaceholder } from './instrumentation-contract';

export class InstrumentationSnippetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InstrumentationSnippetError';
  }
}

export function materializeGuideSnippet(snippet: GuideSnippet, guide: GuideRenderResponse, token: string) {
  return materializeSnippetForCopy(snippet, guide.secretPlaceholders, { authorizationToken: token });
}

/** Materializes a temporary clipboard value without mutating the backend-owned snippet. */
export function materializeSnippetForCopy(
  snippet: GuideSnippet,
  placeholders: Record<string, SecretPlaceholder>,
  transientSecrets: Record<string, string | undefined>
) {
  let content = snippet.content;
  for (const placeholderId of snippet.secretPlaceholders) {
    const placeholder = placeholders[placeholderId];
    const secret = transientSecrets[placeholderId];
    if (!placeholder || placeholder.valueFormat !== 'url_unreserved' || placeholder.replacement !== 'raw') {
      throw new InstrumentationSnippetError(`Unsupported secret placeholder: ${placeholderId}`);
    }
    if (!secret || !/^[A-Za-z0-9._~-]+$/.test(secret)) {
      throw new InstrumentationSnippetError(`Invalid transient secret: ${placeholderId}`);
    }
    if (!content.includes(placeholder.marker)) {
      throw new InstrumentationSnippetError(`Secret marker is missing: ${placeholderId}`);
    }
    content = content.replaceAll(placeholder.marker, secret);
  }
  return content;
}
