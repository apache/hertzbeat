/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
/** Upload whitespace is separate from the document's compact 65,535-byte storage limit. */
export async function readDashboardImportFile(file: Pick<File, 'size' | 'text'>): Promise<string> {
  if (file.size > 256 * 1024) throw new Error('Dashboard upload is too large');
  return file.text();
}
