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

import type { SetupExportArtifact } from '../api/setup-api';

type UrlAdapter = {
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
};
type AnchorAdapter = { href: string; download: string; click: () => void; remove: () => void };
type DocumentAdapter = {
  createElement: (name: 'a') => AnchorAdapter;
  body: { append: (anchor: AnchorAdapter) => void };
};

export function downloadSetupArtifact(
  artifact: SetupExportArtifact,
  urls: UrlAdapter = URL,
  documentAdapter: DocumentAdapter = browserDocumentAdapter()
) {
  const objectUrl = urls.createObjectURL(artifact.blob);
  const anchor = documentAdapter.createElement('a');
  try {
    anchor.href = objectUrl;
    anchor.download = artifact.fileName;
    documentAdapter.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    urls.revokeObjectURL(objectUrl);
  }
}

function browserDocumentAdapter(): DocumentAdapter {
  const anchor = document.createElement('a');
  return {
    createElement: () => anchor,
    body: { append: () => document.body.append(anchor) }
  };
}
