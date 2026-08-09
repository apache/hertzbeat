/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { ExportResponse } from '../model/deployment-contract';

export function downloadDeploymentExport(artifact: ExportResponse) {
  const objectUrl = URL.createObjectURL(artifact.blob);
  const anchor = document.createElement('a');
  try {
    anchor.href = objectUrl;
    anchor.download = artifact.fileName;
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }
}
