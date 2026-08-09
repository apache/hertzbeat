/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.config;

/** One closeable authoritative read of all snapshots used by the activation classifier. */
record MigrationActivationSnapshots(
        CandidateRead<ManagedApplicationConfig> activeApplication,
        CandidateRead<ManagedApplicationConfig> candidateApplication,
        CandidateRead<ManagedApplicationConfig> lastKnownGoodApplication,
        CandidateRead<ManagedSecrets> activeSecrets,
        CandidateRead<ManagedSecrets> candidateSecrets,
        CandidateRead<ManagedSecrets> lastKnownGoodSecrets) implements AutoCloseable {

    @Override
    public void close() {
        ManagedConfigurationTransaction.close(activeSecrets);
        ManagedConfigurationTransaction.close(candidateSecrets);
        ManagedConfigurationTransaction.close(lastKnownGoodSecrets);
    }

    @Override
    public String toString() {
        return "MigrationActivationSnapshots[applicationStates="
                + activeApplication.state() + "/" + candidateApplication.state() + "/"
                + lastKnownGoodApplication.state() + ", secretStates="
                + activeSecrets.state() + "/" + candidateSecrets.state() + "/"
                + lastKnownGoodSecrets.state() + "]";
    }
}
