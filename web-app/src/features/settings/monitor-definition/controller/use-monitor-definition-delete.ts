/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useRef, useState } from 'react';

import { deleteMonitorDefinition, MonitorDefinitionRequestError } from '../api/monitor-definition-api';
import {
  monitorDefinitionNeedsCatalogReconciliation,
  type MonitorDefinitionCatalogItem,
  type MonitorDefinitionDeleteDisposition,
  type MonitorDefinitionFailureKind
} from '../model/monitor-definition-model';

export function useMonitorDefinitionDelete(canWrite: boolean, onChanged: () => void) {
  const [deleteTarget, setDeleteTarget] = useState<MonitorDefinitionCatalogItem | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteFailure, setDeleteFailure] = useState<MonitorDefinitionFailureKind | null>(null);
  const [notice, setNotice] = useState<MonitorDefinitionDeleteDisposition | null>(null);
  const owner = useRef(false);
  const requestDelete = (item: MonitorDefinitionCatalogItem) => {
    if (!canWrite || !item.deletable || owner.current) return;
    setDeleteFailure(null);
    setDeleteTarget(item);
  };
  const cancelDelete = () => {
    if (!owner.current) setDeleteTarget(null);
  };
  const confirmDelete = async () => {
    const target = deleteTarget;
    if (!target || !canWrite || owner.current) return;
    owner.current = true;
    setDeletePending(true);
    setDeleteFailure(null);
    try {
      const receipt = await deleteMonitorDefinition(target.app, target.revision);
      setNotice(receipt.disposition);
      setDeleteTarget(null);
      onChanged();
    } catch (error) {
      const failure = error instanceof MonitorDefinitionRequestError ? error.kind : 'error';
      if (monitorDefinitionNeedsCatalogReconciliation(failure)) onChanged();
      setDeleteFailure(failure);
    } finally {
      owner.current = false;
      setDeletePending(false);
    }
  };
  return {
    deleteFailure,
    deletePending,
    deleteTarget,
    notice,
    actions: { cancelDelete, confirmDelete, requestDelete }
  };
}
