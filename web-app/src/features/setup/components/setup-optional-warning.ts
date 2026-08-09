/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import type { SetupWarningCode } from '../model/setup-contract';

export function optionalWarningKey(warning: SetupWarningCode) {
  return `setup.optional.warning.${warning}`;
}
