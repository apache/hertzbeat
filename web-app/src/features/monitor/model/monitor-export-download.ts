/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { MonitorExportArtifact } from './monitor-export-model';

export function saveMonitorExport(artifact: MonitorExportArtifact) {
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
