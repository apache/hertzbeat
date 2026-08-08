/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export const setupQueryKeys = {
  status: () => ['setup', 'status'] as const,
  operation: (operationId: string) => ['setup', 'operation', operationId] as const
};
