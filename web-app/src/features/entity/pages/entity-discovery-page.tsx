/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { EntityDiscoveryView } from '../components';
import { useEntityDiscoveryController } from '../controller';

export function EntityDiscoveryPage() {
  return <EntityDiscoveryView {...useEntityDiscoveryController()} />;
}
