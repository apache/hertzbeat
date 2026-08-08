/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

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
