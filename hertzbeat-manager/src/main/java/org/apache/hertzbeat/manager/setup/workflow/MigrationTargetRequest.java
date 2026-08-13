/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;

/** Secret-free command request values retained for same-operation admission checks. */
record MigrationTargetRequest(
        String operationId,
        MigrationTarget target,
        ApplyMode applyMode,
        MetadataDatabaseSettings settings) {

    MigrationTargetRequest {
        Objects.requireNonNull(operationId, "operationId");
        Objects.requireNonNull(target, "target");
        Objects.requireNonNull(applyMode, "applyMode");
        Objects.requireNonNull(settings, "settings");
    }
}
