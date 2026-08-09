/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { DeploymentRequestError } from '../api/deployment-api';

export type DeploymentWriteOutcome = 'definite_rejection' | 'uncertain';

/** Only an explicit non-timeout client response proves that a deployment write was rejected. */
export function deploymentWriteOutcome(error: unknown): DeploymentWriteOutcome {
  if (!(error instanceof DeploymentRequestError) || error.kind !== 'http') return 'uncertain';
  const status = error.status;
  return status !== undefined && status >= 400 && status < 500 && status !== 408 ? 'definite_rejection' : 'uncertain';
}
