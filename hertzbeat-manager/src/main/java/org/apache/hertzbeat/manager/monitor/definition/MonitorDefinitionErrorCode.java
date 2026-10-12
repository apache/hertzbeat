/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.monitor.definition;

/** Stable public failures for version 1 monitor-definition reads and validation. */
public enum MonitorDefinitionErrorCode {
    NOT_FOUND("monitor_definition_not_found"),
    INVALID_APP("monitor_definition_app_invalid"),
    INVALID_DEFINITION("monitor_definition_invalid"),
    CREATE_CONFLICT("monitor_definition_create_conflict"),
    EXPECTED_APP_REQUIRED("monitor_definition_expected_app_required"),
    EXPECTED_APP_UNEXPECTED("monitor_definition_expected_app_unexpected"),
    UPDATE_TARGET_MISMATCH("monitor_definition_update_target_mismatch"),
    IMMUTABLE("monitor_definition_immutable"),
    REVISION_REQUIRED("monitor_definition_revision_required"),
    REVISION_INVALID("monitor_definition_revision_invalid"),
    REVISION_CONFLICT("monitor_definition_revision_conflict"),
    IN_USE("monitor_definition_in_use"),
    PERSISTENCE_FAILED("monitor_definition_persistence_failed"),
    RUNTIME_UPDATE_FAILED("monitor_definition_runtime_update_failed"),
    STATE_UNCERTAIN("monitor_definition_state_uncertain");

    private final String value;

    MonitorDefinitionErrorCode(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }
}
