/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Aggregate invariants for the one-active-operation plus bounded-history model. */
final class MigrationOperationCollectionPolicy {

    void validate(List<MigrationOperationSnapshot> snapshots) {
        Set<String> operationIds = new HashSet<>();
        int active = 0;
        int terminal = 0;
        for (MigrationOperationSnapshot snapshot : snapshots) {
            if (!operationIds.add(snapshot.operationId())) {
                invalid();
            }
            if (snapshot.terminal()) {
                terminal++;
            } else {
                active++;
            }
        }
        int total = snapshots.size();
        if (active > 1 || terminal > FileMigrationOperationStore.HISTORY_LIMIT
                || total > FileMigrationOperationStore.HISTORY_LIMIT + 1
                || total == FileMigrationOperationStore.HISTORY_LIMIT + 1
                    && (active != 1 || terminal != FileMigrationOperationStore.HISTORY_LIMIT)) {
            invalid();
        }
    }

    private void invalid() {
        throw new IllegalArgumentException("Invalid migration operation collection");
    }
}
