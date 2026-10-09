/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

export const dashboardQueryKeys = {
  monitors: () => ['dashboard', 'monitors'] as const,
  alerts: () => ['dashboard', 'alerts'] as const,
  services: () => ['dashboard', 'services'] as const
};
