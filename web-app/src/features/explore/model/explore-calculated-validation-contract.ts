/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
export type ValidateCalculatedFields = (
  raw: string,
  preview?: { definitionId: string; sourceText: string },
  signal?: AbortSignal
) => Promise<{
  valid: boolean;
  errors?: { path: string; code: string }[];
  preview?: { definitionId: string; values: Record<string, string | number | boolean | null> } | null;
}>;
