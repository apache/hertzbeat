/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.config;

/** Immutable, secret-free identity recorded beside a migration candidate bundle. */
record MigrationCandidateManifest(String operationId, String candidateGeneration,
                                  String baseGeneration, String targetIdentityHash) {
    void validate() {
        new ManagedMigrationConfigurationTransaction.CandidateRef(operationId, candidateGeneration);
        ManagedMigrationConfigurationTransaction.requireGeneration(baseGeneration, "base generation");
        ManagedMigrationConfigurationTransaction.requireIdentityHash(targetIdentityHash);
    }
}
