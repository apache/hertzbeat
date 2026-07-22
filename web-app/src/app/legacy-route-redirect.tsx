/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { Navigate, useLocation } from 'react-router-dom';

import { legacyRedirectTarget } from './legacy-route-target';
import type { LegacyRouteDefinition } from './route-registry';

export function LegacyRouteRedirect({ definition }: { definition: LegacyRouteDefinition }) {
  const location = useLocation();
  return <Navigate replace to={legacyRedirectTarget(definition, location.search, location.hash)} />;
}
