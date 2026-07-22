/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export const entityQueryKeys = {
  all: ['entities'] as const,
  list: (scope: string) => [...entityQueryKeys.all, 'list', scope] as const,
  detail: (id: number | undefined) => [...entityQueryKeys.all, 'detail', id] as const
};
