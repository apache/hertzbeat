/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { EntityDefinitionView } from '../components';
import { useEntityDefinitionController } from '../controller';

export function EntityDefinitionPage() {
  return <EntityDefinitionView {...useEntityDefinitionController()} />;
}
