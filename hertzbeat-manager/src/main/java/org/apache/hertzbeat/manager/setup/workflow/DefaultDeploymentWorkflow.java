/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.function.LongSupplier;
import java.util.function.Supplier;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.ActivateMigrationRequest;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.DeploymentView;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MaintenanceAdmission;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MaintenanceMode;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MetadataMigrationRequest;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MetadataMigrationValidationRequest;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationCapability;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationExportRequest;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationView;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.TargetInspection;
import org.apache.hertzbeat.manager.setup.api.DeploymentWorkflow;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ValidationResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiException;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.springframework.http.HttpStatus;

/** Authenticated managed-only deployment workflow over one retained migration graph. */
public final class DefaultDeploymentWorkflow implements DeploymentWorkflow {

    private final Object migrateAdmission = new Object();
    private final DeploymentViewProjector projector;
    private final ManagedDeploymentMigrationCommands commands;
    private final MetadataMigrationTargetInspector inspector;
    private final MetadataMigrationPolicy policy;
    private final DeploymentWorkflowFailureMapper failures;
    private final Clock clock;
    private final Duration timeout;
    private final LongSupplier ticker;
    private final boolean available;
    private boolean closed;
    private int activeCalls;

    DefaultDeploymentWorkflow(
            DeploymentViewProjector projector,
            ManagedDeploymentMigrationCommands commands,
            MetadataMigrationTargetInspector inspector,
            MetadataMigrationPolicy policy,
            DeploymentWorkflowFailureMapper failures,
            Clock clock,
            Duration timeout,
            LongSupplier ticker) {
        this.projector = Objects.requireNonNull(projector, "projector");
        this.commands = Objects.requireNonNull(commands, "commands");
        this.inspector = Objects.requireNonNull(inspector, "inspector");
        this.policy = Objects.requireNonNull(policy, "policy");
        this.failures = Objects.requireNonNull(failures, "failures");
        this.clock = Objects.requireNonNull(clock, "clock");
        this.timeout = requirePositive(timeout);
        this.ticker = Objects.requireNonNull(ticker, "ticker");
        available = true;
    }

    private DefaultDeploymentWorkflow(
            DeploymentViewProjector projector,
            DeploymentWorkflowFailureMapper failures,
            Clock clock) {
        this.projector = Objects.requireNonNull(projector, "projector");
        commands = null;
        inspector = null;
        policy = null;
        this.failures = Objects.requireNonNull(failures, "failures");
        this.clock = Objects.requireNonNull(clock, "clock");
        timeout = Duration.ofSeconds(1);
        ticker = System::nanoTime;
        available = false;
    }

    static DefaultDeploymentWorkflow unavailable(
            DeploymentViewProjector projector,
            DeploymentWorkflowFailureMapper failures,
            Clock clock) {
        return new DefaultDeploymentWorkflow(projector, failures, clock);
    }

    @Override
    public DeploymentView deployment() {
        return invoke(false, projector::project);
    }

    @Override
    public ValidationResponse validate(MetadataMigrationValidationRequest request) {
        Objects.requireNonNull(request, "request");
        return invoke(true, () -> validateTarget(request));
    }

    @Override
    public MigrationView migrate(MetadataMigrationRequest request) {
        Objects.requireNonNull(request, "request");
        synchronized (migrateAdmission) {
            return invoke(true, () -> {
                requireManaged(request.applyMode());
                return migrateManaged(request);
            });
        }
    }

    @Override
    public MigrationView migration(String operationId) {
        return invoke(true, () -> commands.migration(operationId));
    }

    @Override
    public MigrationView activate(String operationId, ActivateMigrationRequest request) {
        return invoke(true, () -> {
            requireOperationalAdmission(operationId);
            return commands.activate(operationId, request);
        });
    }

    @Override
    public PreparedMigrationExport prepareExport(
            String operationId, MigrationExportRequest request) {
        return invoke(true, () -> {
            throw unavailable();
        });
    }

    synchronized void closeAdmission() {
        closed = true;
        boolean interrupted = Thread.interrupted();
        try {
            while (activeCalls != 0) {
                try {
                    wait();
                } catch (InterruptedException waitInterrupted) {
                    interrupted = true;
                }
            }
        } finally {
            if (interrupted) {
                Thread.currentThread().interrupt();
            }
        }
    }

    private ValidationResponse validateTarget(MetadataMigrationValidationRequest request) {
        DeploymentView deployment = projector.project();
        if (!deployment.migration().allowed()) {
            return invalid(deployment.migration().blockedBy());
        }
        TargetInspection inspection = inspect(request.targetDatabase());
        return switch (inspection) {
            case EMPTY -> new ValidationResponse(true, clock.instant(), null, List.of());
            case NON_EMPTY -> invalid(SetupErrorCode.MIGRATION_TARGET_NOT_EMPTY);
            case UNKNOWN -> invalid(SetupErrorCode.METADATA_CONNECTION_FAILED);
        };
    }

    private MigrationView migrateManaged(MetadataMigrationRequest request) {
        MigrationView existing = existing(request.operationId());
        if (existing != null && existing.state() != MigrationOperationState.PENDING) {
            requireTarget(existing, request);
            return existing;
        }
        Optional<MigrationView> joined = commands.joinExecuting(request);
        if (joined.isPresent()) {
            return joined.orElseThrow();
        }
        MigrationView settled = existing(request.operationId());
        if (settled != null && settled.state() != MigrationOperationState.PENDING) {
            requireTarget(settled, request);
            return settled;
        }
        Optional<String> active = commands.activeOperationId();
        if (active.isPresent() && !active.orElseThrow().equals(request.operationId())) {
            throw new MigrationOperationStoreException(SetupErrorCode.OPERATION_CONFLICT);
        }
        DeploymentView deployment = admission(projector.project(), request.operationId());
        TargetInspection inspection = inspect(request.targetDatabase());
        policy.requireMigrationAllowed(deployment, request.target(), inspection);
        return commands.migrate(request);
    }

    private MigrationView existing(String operationId) {
        try {
            return commands.migration(operationId);
        } catch (MigrationOperationStoreException failure) {
            if (failure.errorCode() == SetupErrorCode.OPERATION_NOT_FOUND) {
                return null;
            }
            throw failure;
        }
    }

    private TargetInspection inspect(MetadataDatabaseConfiguration database) {
        MetadataDatabaseSettings settings = new MetadataDatabaseSettings(
                database.kind(), database.jdbcUrl(), database.username());
        try (SecretValue password = SecretValue.of(database.password())) {
            JdbcMetadataMigrationDeadline deadline =
                    JdbcMetadataMigrationDeadline.start(timeout, ticker);
            inspector.retryCleanup(deadline);
            return inspector.inspect(settings, password, deadline);
        }
    }

    private void requireOperationalAdmission(String operationId) {
        DeploymentView current = admission(projector.project(), operationId);
        if (!current.migration().allowed()) {
            throw unavailable();
        }
    }

    private static DeploymentView admission(DeploymentView deployment, String operationId) {
        MigrationCapability migration = deployment.migration();
        if (migration.blockedBy() != SetupErrorCode.OPERATION_CONFLICT
                || !operationId.equals(migration.activeOperationId())) {
            return deployment;
        }
        MaintenanceAdmission maintenance = deployment.maintenanceMode() == MaintenanceMode.ACTIVE
                ? MaintenanceAdmission.USE_CURRENT : MaintenanceAdmission.AUTO_ENTER;
        return new DeploymentView(
                deployment.observedAt(), deployment.managementDatabase(), deployment.greptimeDatabase(),
                deployment.applyMode(), deployment.maintenanceMode(), deployment.topology(),
                MigrationCapability.permitted(maintenance));
    }

    private static void requireTarget(MigrationView existing, MetadataMigrationRequest request) {
        if (existing.target() != request.target()) {
            throw new MigrationOperationStoreException(SetupErrorCode.OPERATION_CONFLICT);
        }
    }

    private static void requireManaged(ApplyMode applyMode) {
        if (applyMode != ApplyMode.MANAGED_WRITE) {
            throw new SetupApiException(SetupErrorCode.INVALID_REQUEST, HttpStatus.BAD_REQUEST);
        }
    }

    private ValidationResponse invalid(SetupErrorCode code) {
        return new ValidationResponse(false, clock.instant(), code, List.of());
    }

    private <T> T translate(Supplier<T> action) {
        try {
            return action.get();
        } catch (RuntimeException failure) {
            throw failures.translate(failure);
        }
    }

    private <T> T invoke(boolean requiresAvailable, Supplier<T> action) {
        begin(requiresAvailable);
        try {
            return translate(action);
        } finally {
            end();
        }
    }

    private synchronized void begin(boolean requiresAvailable) {
        if (closed || requiresAvailable && !available) {
            throw unavailable();
        }
        activeCalls++;
    }

    private synchronized void end() {
        activeCalls--;
        if (activeCalls == 0) {
            notifyAll();
        }
    }

    private static SetupApiException unavailable() {
        return new SetupApiException(
                SetupErrorCode.MIGRATION_UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE);
    }

    private static Duration requirePositive(Duration timeout) {
        Objects.requireNonNull(timeout, "timeout");
        if (timeout.isZero() || timeout.isNegative()) {
            throw new IllegalArgumentException("Migration timeout must be positive");
        }
        return timeout;
    }
}
