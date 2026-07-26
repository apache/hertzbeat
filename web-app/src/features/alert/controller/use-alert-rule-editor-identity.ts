/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import { useEffect, useLayoutEffect, useRef } from 'react';

import type { AlertRuleEditorIdentityController, AlertRuleEditorOperationIdentity } from './alert-rule-editor-state';

/** Invalidates async preview/save ownership when the route draft changes or unmounts. */
export function useAlertRuleEditorIdentity(routeToken: symbol): AlertRuleEditorIdentityController {
  const routeTokenRef = useRef<symbol | null>(routeToken);
  const editorEpochRef = useRef(0);
  useLayoutEffect(() => {
    routeTokenRef.current = routeToken;
  }, [routeToken]);
  useEffect(
    () => () => {
      routeTokenRef.current = null;
      editorEpochRef.current += 1;
    },
    []
  );
  const capture = (): AlertRuleEditorOperationIdentity => ({
    routeToken,
    editorEpoch: editorEpochRef.current
  });
  return {
    capture,
    invalidate: () => {
      editorEpochRef.current += 1;
    },
    isCurrent: owner => routeTokenRef.current === owner.routeToken && editorEpochRef.current === owner.editorEpoch
  };
}
