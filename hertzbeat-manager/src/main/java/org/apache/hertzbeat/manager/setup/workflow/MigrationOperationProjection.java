/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationView;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Maps durable internal state to the frozen secret-free API projection. */
final class MigrationOperationProjection {

    private MigrationOperationProjection() {
    }

    static MigrationView view(MigrationOperationSnapshot snapshot) {
        return new MigrationView(
                snapshot.operationId(), snapshot.state(), MetadataDatabaseKind.H2, snapshot.target(),
                snapshot.stage(), snapshot.progressPercent(), snapshot.createdAt(), snapshot.startedAt(),
                snapshot.completedAt(), snapshot.verificationState(), snapshot.errorCode(),
                snapshot.nextPollAfterMillis(), snapshot.activationAvailable(), snapshot.restartRequired(),
                snapshot.externalApplyRequired());
    }
}
