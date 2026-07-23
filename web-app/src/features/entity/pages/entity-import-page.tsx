/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { EntityImportView } from '../components';
import { useEntityImportController } from '../controller';

export function EntityImportPage() {
  return <EntityImportView {...useEntityImportController()} />;
}
