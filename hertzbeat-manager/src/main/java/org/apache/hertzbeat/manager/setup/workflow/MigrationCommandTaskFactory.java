/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MetadataMigrationRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;

/** Builds one command task while keeping request and credential material out of retained state. */
final class MigrationCommandTaskFactory {

    private final FileMigrationOperationStore store;
    private final ManagedMigrationConfigurationTransaction configuration;
    private final RetainedCutoverCoordinator coordinator;
    private final Clock clock;
    private final Duration timeout;

    MigrationCommandTaskFactory(
            FileMigrationOperationStore store,
            ManagedMigrationConfigurationTransaction configuration,
            RetainedCutoverCoordinator coordinator,
            Clock clock,
            Duration timeout) {
        this.store = Objects.requireNonNull(store, "store");
        this.configuration = Objects.requireNonNull(configuration, "configuration");
        this.coordinator = Objects.requireNonNull(coordinator, "coordinator");
        this.clock = Objects.requireNonNull(clock, "clock");
        this.timeout = Objects.requireNonNull(timeout, "timeout");
    }

    MigrationTargetRequest request(MetadataMigrationRequest request) {
        MetadataDatabaseConfiguration database = request.targetDatabase();
        return new MigrationTargetRequest(
                request.operationId(), request.target(), request.applyMode(),
                new MetadataDatabaseSettings(database.kind(), database.jdbcUrl(), database.username()));
    }

    MigrationCommandTask create(
            DeploymentMigrationCommandRunner owner,
            MigrationTargetRequest target,
            MigrationOperationSnapshot pending,
            String password) {
        MigrationCommandDraft draft = draft(target, pending);
        SecretValue ownedPassword = null;
        try {
            try (SecretValue borrowed = SecretValue.of(password)) {
                ownedPassword = SecretValue.copyOf(borrowed);
            }
            MigrationPreparationBarrier barrier = new MigrationPreparationBarrier(store);
            return new MigrationCommandTask(
                    owner, coordinator, store, configuration, draft, target.settings(), ownedPassword,
                    timeout, clock, barrier);
        } catch (Error fatal) {
            close(ownedPassword);
            throw fatal;
        } catch (RuntimeException failure) {
            close(ownedPassword);
            throw failure;
        }
    }

    static void requireCompatible(
            MigrationOperationSnapshot snapshot, MigrationTargetRequest request) {
        if (snapshot.target() != request.target() || snapshot.applyMode() != request.applyMode()) {
            throw new MigrationOperationStoreException(SetupErrorCode.OPERATION_CONFLICT);
        }
    }

    private MigrationCommandDraft draft(
            MigrationTargetRequest request, MigrationOperationSnapshot pending) {
        String generation = MigrationCandidateGeneration.fromOperationId(request.operationId());
        Instant createdAt = pending == null ? clock.instant() : pending.createdAt();
        if (pending != null) {
            requireCompatible(pending, request);
            if (!generation.equals(pending.managedCandidateGeneration())) {
                throw new MigrationOperationStoreException(SetupErrorCode.OPERATION_CONFLICT);
            }
        }
        return new MigrationCommandDraft(
                request.operationId(), request.target(), request.applyMode(), createdAt, generation);
    }

    private static void close(SecretValue secret) {
        if (secret != null) {
            secret.close();
        }
    }
}
