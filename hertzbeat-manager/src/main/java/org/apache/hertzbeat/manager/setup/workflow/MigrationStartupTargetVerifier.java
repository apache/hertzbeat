/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.CandidateRef;

/** Read-only target verification boundary for startup reconciliation. */
@FunctionalInterface
interface MigrationStartupTargetVerifier {

    MigrationStartupTargetVerification verify(CandidateRef candidate, String targetIdentityHash);
}
