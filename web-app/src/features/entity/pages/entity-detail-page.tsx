/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { EntityDetailView } from '../components';
import { useEntityDetailController } from '../controller';

export function EntityDetailPage() {
  return <EntityDetailView {...useEntityDetailController()} />;
}
