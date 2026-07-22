/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { EntityListView } from '../components';
import { useEntityListController } from '../controller';

export function EntityListPage() {
  return <EntityListView {...useEntityListController()} />;
}
