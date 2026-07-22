/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { Navigate, useLocation } from 'react-router-dom';

export function LegacySettingsRedirect({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate replace to={`${to}${location.search}${location.hash}`} />;
}
