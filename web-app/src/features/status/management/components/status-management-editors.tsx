/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { StatusComponent, StatusIncident } from '../model/status-management-contract';
import { StatusComponentEditor } from './status-component-editor';
import { StatusIncidentEditor } from './status-incident-editor';

type StatusManagementEditorsProps = {
  component: StatusComponent | undefined;
  incident: StatusIncident | undefined;
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
      {props.component && (
        <StatusComponentEditor
          component={props.component}
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
