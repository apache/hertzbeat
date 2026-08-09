/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export const deploymentQueryKeys = {
  view: () => ['deployment', 'view'] as const,
  migration: (operationId: string) => ['deployment', 'migration', operationId] as const
};
