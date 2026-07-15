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

package org.apache.hertzbeat.collector.runtime.otel;

import org.apache.hertzbeat.collector.dispatch.CollectorRuntimeStatusProvider;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;

/**
 * Adapts the local supervisor snapshot to the versioned Collector control-plane contract.
 */
public class OtelRuntimeStatusProvider implements CollectorRuntimeStatusProvider {

    private final OtelRuntimeProperties properties;
    private final OtelRuntimeSupervisor supervisor;

    public OtelRuntimeStatusProvider(OtelRuntimeProperties properties, OtelRuntimeSupervisor supervisor) {
        this.properties = properties;
        this.supervisor = supervisor;
    }

    @Override
    public ManagedOtelRuntimeStatus status() {
        OtelRuntimeSnapshot snapshot = supervisor.snapshot();
        return new ManagedOtelRuntimeStatus(
                ManagedOtelRuntimeStatus.CURRENT_SCHEMA_VERSION,
                properties.isEnabled(),
                ManagedOtelRuntimeStatus.RuntimeState.valueOf(snapshot.state().name()),
                properties.getConfigRevision(),
                supervisor.activeRevision(),
                credentialState(),
                snapshot.restartCount(),
                snapshot.changedAt(),
                snapshot.lastError()
        );
    }

    private ManagedOtelRuntimeStatus.IntakeCredentialState credentialState() {
        if (!properties.isEnabled()) {
            return ManagedOtelRuntimeStatus.IntakeCredentialState.NOT_REQUIRED;
        }
        if (properties.getToken() == null || properties.getToken().isBlank()) {
            return ManagedOtelRuntimeStatus.IntakeCredentialState.MISSING;
        }
        return ManagedOtelRuntimeStatus.IntakeCredentialState.CONFIGURED;
    }
}
