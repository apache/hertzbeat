/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.nio.file.Path;
import java.util.Objects;

/** Secret-free, locked pre-Spring admission for the migration operation collection. */
public enum ManagedMigrationStartupAdmission {
    CLEAR,
    GATED_RECOVERY;

    /** Returns clear only when the exact locked collection has no nonterminal operation. */
    public static ManagedMigrationStartupAdmission inspect(Path installationRoot) {
        Objects.requireNonNull(installationRoot, "installationRoot");
        try {
            return new FileMigrationOperationStore(installationRoot)
                    .selectUniqueNonterminalForStartup()
                    .isEmpty() ? CLEAR : GATED_RECOVERY;
        } catch (RuntimeException failure) {
            return GATED_RECOVERY;
        }
    }
}
