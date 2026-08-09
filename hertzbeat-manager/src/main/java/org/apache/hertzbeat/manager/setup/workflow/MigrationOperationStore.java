/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;

/** Persistence port with optimistic expected-state transitions. */
public interface MigrationOperationStore {

    MigrationOperationSnapshot create(MigrationOperationSnapshot snapshot);

    Optional<MigrationOperationSnapshot> find(String operationId);

    List<MigrationOperationSnapshot> history();

    MigrationOperationSnapshot compareAndTransition(
            String operationId, MigrationOperationState expectedState, MigrationOperationSnapshot replacement);
}
