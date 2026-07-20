/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import type { StatusComponent, StatusIncident } from '../model/status-management-contract';
import { StatusComponentEditor } from './status-component-editor';
import { StatusIncidentEditor } from './status-incident-editor';

type StatusManagementEditorsProps = {
  component: Partial<StatusComponent> | undefined;
  incident: StatusIncident | undefined;
  orgId: number | undefined;
  components: StatusComponent[];
  commandLocked: boolean;
  componentWriteRecovery: 'proof' | 'commit-uncertain' | undefined;
  incidentWriteRecovery: 'proof' | 'commit-uncertain' | undefined;
  componentSaving: boolean;
  incidentSaving: boolean;
  onCloseComponent: () => void;
  onCloseIncident: () => void;
  onRetryComponentWrite: () => void;
  onRetryIncidentWrite: () => void;
  onSaveComponent: (value: StatusComponent) => void;
  onSaveIncident: (value: StatusIncident) => void;
};

export function StatusManagementEditors(props: StatusManagementEditorsProps) {
  return (
    <>
      {props.component && props.orgId && (
        <StatusComponentEditor
          component={{ ...props.component, orgId: props.orgId }}
          components={props.components}
          commandLocked={props.commandLocked}
          writeRecovery={props.componentWriteRecovery}
          saving={props.componentSaving}
          onCancel={props.onCloseComponent}
          onRetry={props.onRetryComponentWrite}
          onSubmit={props.onSaveComponent}
        />
      )}
      {props.incident && (
        <StatusIncidentEditor
          incident={props.incident}
          components={props.components}
          commandLocked={props.commandLocked}
          writeRecovery={props.incidentWriteRecovery}
          saving={props.incidentSaving}
          onCancel={props.onCloseIncident}
          onRetry={props.onRetryIncidentWrite}
          onSubmit={props.onSaveIncident}
        />
      )}
    </>
  );
}
