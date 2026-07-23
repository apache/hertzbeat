/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */

import { EntityEditorView } from '../components';
import { useEntityEditorController } from '../controller';

export function EntityEditorPage({ mode }: { mode: 'new' | 'edit' }) {
  return <EntityEditorView {...useEntityEditorController(mode)} />;
}
