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

export type BrowserDownloadArtifact = { data: Blob; filename: string };

/** Extracts a safe leaf filename from a server-controlled response header. */
export function safeDownloadFilename(contentDisposition: string | null, fallback: string) {
  const encoded = contentDispositionFilename(contentDisposition);
  if (!encoded) return fallback;
  const decoded = decodeFilename(encoded);
  const leaf = decoded.split(/[\\/]/).at(-1)?.trim();
  if (!leaf || leaf === '.' || leaf === '..' || leaf.length > 255 || hasControlCharacter(leaf)) return fallback;
  return leaf;
}

export function saveBrowserDownload(artifact: BrowserDownloadArtifact) {
  const objectUrl = URL.createObjectURL(artifact.data);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = artifact.filename;
  link.rel = 'noopener';
  try {
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}

function contentDispositionFilename(value: string | null) {
  if (!value) return undefined;
  const extended = value.match(/(?:^|;)\s*filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1];
  if (extended) return extended.trim();
  const regular = value.match(/(?:^|;)\s*filename\s*=\s*(?:"([^"]*)"|([^;]*))/i);
  return (regular?.[1] ?? regular?.[2])?.trim();
}

function decodeFilename(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, '%20'));
  } catch {
    return value;
  }
}

function hasControlCharacter(value: string) {
  return [...value].some(character => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
}
