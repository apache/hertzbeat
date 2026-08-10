/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.util.Objects;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.LockSupport;
import java.util.function.LongSupplier;
import org.apache.hertzbeat.manager.maintenance.MetadataMaintenanceCoordinator;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceOrchestrator;
import org.apache.hertzbeat.manager.maintenance.StandaloneDeploymentOwnerView;
import org.apache.hertzbeat.manager.setup.api.DeploymentWorkflow;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigCapability;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction;

/** Owns the one process-local migration graph and closes its exact owners in safety order. */
final class DeploymentMigrationRuntime implements AutoCloseable {

    private static final long INITIAL_DESTROY_BACKOFF_NANOS = TimeUnit.MILLISECONDS.toNanos(1);
    private static final long MAX_DESTROY_BACKOFF_NANOS = TimeUnit.MILLISECONDS.toNanos(100);

    private final DefaultDeploymentWorkflow workflow;
    private final ManagedDeploymentMigrationCommands commands;
    private final MetadataMigrationTargetInspector inspector;
    private final JdbcMetadataMigrationExecutor copyExecutor;
    private final TargetJdbcConnectionFactory factory;
    private final Duration cleanupTimeout;
    private final LongSupplier ticker;
    private ClosePhase closePhase = ClosePhase.ADMISSION;

    DeploymentMigrationRuntime(
            DefaultDeploymentWorkflow workflow,
            ManagedDeploymentMigrationCommands commands,
            MetadataMigrationTargetInspector inspector,
            JdbcMetadataMigrationExecutor copyExecutor,
            TargetJdbcConnectionFactory factory,
            Duration cleanupTimeout,
            LongSupplier ticker) {
        this.workflow = Objects.requireNonNull(workflow, "workflow");
        this.commands = Objects.requireNonNull(commands, "commands");
        this.inspector = Objects.requireNonNull(inspector, "inspector");
        this.copyExecutor = Objects.requireNonNull(copyExecutor, "copyExecutor");
        this.factory = Objects.requireNonNull(factory, "factory");
        this.cleanupTimeout = requirePositive(cleanupTimeout);
        this.ticker = Objects.requireNonNull(ticker, "ticker");
    }

    private DeploymentMigrationRuntime(DefaultDeploymentWorkflow workflow) {
        this.workflow = Objects.requireNonNull(workflow, "workflow");
        commands = null;
        inspector = null;
        copyExecutor = null;
        factory = null;
        cleanupTimeout = Duration.ofSeconds(1);
        ticker = System::nanoTime;
        closePhase = ClosePhase.CLOSED;
    }

    static DeploymentMigrationRuntime unavailable(DefaultDeploymentWorkflow workflow) {
        return new DeploymentMigrationRuntime(workflow);
    }

    static DeploymentMigrationRuntime open(OpenContext context) {
        return open(context, stage -> { });
    }

    static DeploymentMigrationRuntime open(
            OpenContext context, ConstructionCheckpoint checkpoint) {
        Objects.requireNonNull(context, "context").validate();
        Objects.requireNonNull(checkpoint, "checkpoint");
        TargetJdbcConnectionFactory factory = new TargetJdbcConnectionFactory(
                TargetJdbcAbortExecutor.instance());
        MetadataMigrationTargetInspector inspector = new MetadataMigrationTargetInspector(
                factory, new TargetSchemaReadOnlyInspector());
        JdbcMetadataMigrationExecutor copyExecutor = new JdbcMetadataMigrationExecutor();
        DeploymentMigrationCommandRunner runner = null;
        ManagedDeploymentMigrationCommands commands = null;
        try {
            FileMigrationOperationStore store = new FileMigrationOperationStore(context.root());
            ManagedMigrationConfigurationTransaction configuration =
                    new ManagedMigrationConfigurationTransaction(context.root());
            RetainedCutoverCoordinator coordinator = new RetainedCutoverCoordinator(
                    factory, new FlywayTargetSchemaProvisioner(), context.maintenanceOrchestrator(),
                    copyExecutor, context.ticker());
            runner = new DeploymentMigrationCommandRunner(
                    store, configuration, coordinator, context.clock(), context.timeout());
            checkpoint.reached(ConstructionStage.RUNNER);
            commands = new ManagedDeploymentMigrationCommands(
                    runner, store, configuration, coordinator);
            checkpoint.reached(ConstructionStage.COMMANDS);
            DeploymentViewProjector projector = new DeploymentViewProjector(
                    context.state(), context.capability(), context.owner(), context.maintenance(),
                    commands, context.clock());
            DefaultDeploymentWorkflow workflow = new DefaultDeploymentWorkflow(
                    projector, commands, inspector, new MetadataMigrationPolicy(),
                    new DeploymentWorkflowFailureMapper(), context.clock(), context.timeout(),
                    context.ticker());
            checkpoint.reached(ConstructionStage.WORKFLOW);
            return new DeploymentMigrationRuntime(
                    workflow, commands, inspector, copyExecutor, factory,
                    context.timeout(), context.ticker());
        } catch (RuntimeException | Error failure) {
            Cleanup commandCleanup = commands == null
                    ? runner == null ? null : runner::close
                    : commands::close;
            Throwable result = closeConstruction(
                    commandCleanup, inspector, copyExecutor, factory, context, failure);
            if (result instanceof Error fatal) {
                throw fatal;
            }
            throw (RuntimeException) result;
        }
    }

    DeploymentWorkflow workflow() {
        return workflow;
    }

    boolean available() {
        return commands != null;
    }

    @Override
    public synchronized void close() {
        while (closePhase != ClosePhase.CLOSED) {
            switch (closePhase) {
                case ADMISSION -> closeStep(workflow::closeAdmission, ClosePhase.COMMANDS);
                case COMMANDS -> closeStep(commands::close, ClosePhase.INSPECTOR);
                case INSPECTOR -> closeStep(
                        () -> inspector.shutdown(deadline()), ClosePhase.COPY_EXECUTOR);
                case COPY_EXECUTOR -> closeStep(copyExecutor::close, ClosePhase.FACTORY);
                case FACTORY -> closeStep(factory::close, ClosePhase.CLOSED);
                case CLOSED -> throw new IllegalStateException("Unexpected closed phase");
                default -> throw new IllegalStateException("Unknown close phase");
            }
        }
    }

    synchronized void destroySafely() {
        boolean interrupted = Thread.interrupted();
        JdbcMetadataMigrationDeadline retryBudget = deadline();
        long backoff = INITIAL_DESTROY_BACKOFF_NANOS;
        try {
            while (closePhase != ClosePhase.CLOSED) {
                try {
                    close();
                } catch (RuntimeException ignored) {
                    interrupted |= Thread.interrupted();
                    long remaining = retryBudget.remainingNanos();
                    long pause = remaining > 0
                            ? Math.min(backoff, remaining) : MAX_DESTROY_BACKOFF_NANOS;
                    LockSupport.parkNanos(pause);
                    interrupted |= Thread.interrupted();
                    backoff = Math.min(MAX_DESTROY_BACKOFF_NANOS, backoff * 2);
                }
            }
        } finally {
            if (interrupted) {
                Thread.currentThread().interrupt();
            }
        }
    }

    private void closeStep(Cleanup cleanup, ClosePhase next) {
        runInterruptIsolated(cleanup);
        closePhase = next;
    }

    private JdbcMetadataMigrationDeadline deadline() {
        return JdbcMetadataMigrationDeadline.start(cleanupTimeout, ticker);
    }

    private static Throwable closeConstruction(
            Cleanup commandCleanup,
            MetadataMigrationTargetInspector inspector,
            JdbcMetadataMigrationExecutor executor,
            TargetJdbcConnectionFactory factory,
            OpenContext context,
            Throwable primary) {
        Throwable result = primary;
        if (commandCleanup != null) {
            result = runCleanupAfter(result, commandCleanup);
        }
        result = runCleanupAfter(result, () -> inspector.shutdown(
                JdbcMetadataMigrationDeadline.start(context.timeout(), context.ticker())));
        result = runCleanupAfter(result, executor::close);
        return runCleanupAfter(result, factory::close);
    }

    static Throwable runCleanupAfter(Throwable primary, Cleanup cleanup) {
        try {
            runInterruptIsolated(cleanup);
            return primary;
        } catch (Error cleanupFatal) {
            if (primary instanceof Error) {
                primary.addSuppressed(recoveryMarker());
                return primary;
            }
            cleanupFatal.addSuppressed(recoveryMarker());
            return cleanupFatal;
        } catch (RuntimeException ignored) {
            return primary;
        }
    }

    private static MigrationOperationStoreException recoveryMarker() {
        return new MigrationOperationStoreException(
                org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode
                        .CONFIG_RECOVERY_REQUIRED);
    }

    private static void runInterruptIsolated(Cleanup cleanup) {
        boolean interrupted = Thread.interrupted();
        try {
            cleanup.run();
        } finally {
            interrupted |= Thread.interrupted();
            if (interrupted) {
                Thread.currentThread().interrupt();
            }
        }
    }

    private static Duration requirePositive(Duration timeout) {
        Objects.requireNonNull(timeout, "timeout");
        if (timeout.isNegative() || timeout.isZero()) {
            throw new IllegalArgumentException("Migration timeout must be positive");
        }
        return timeout;
    }

    @FunctionalInterface
    interface Opener {
        DeploymentMigrationRuntime open(OpenContext context);
    }

    @FunctionalInterface
    interface ConstructionCheckpoint {
        void reached(ConstructionStage stage);
    }

    enum ConstructionStage {
        RUNNER,
        COMMANDS,
        WORKFLOW
    }

    record OpenContext(
            Path root,
            StandaloneDeploymentOwnerView owner,
            SetupRuntimeState state,
            ManagedConfigCapability capability,
            MetadataMaintenanceCoordinator maintenance,
            MigrationMaintenanceOrchestrator maintenanceOrchestrator,
            Clock clock,
            Duration timeout,
            LongSupplier ticker) {

        OpenContext {
            root = Objects.requireNonNull(root, "root").toAbsolutePath().normalize();
            Objects.requireNonNull(owner, "owner");
            Objects.requireNonNull(state, "state");
            Objects.requireNonNull(capability, "capability");
            Objects.requireNonNull(maintenance, "maintenance");
            Objects.requireNonNull(maintenanceOrchestrator, "maintenanceOrchestrator");
            Objects.requireNonNull(clock, "clock");
            requirePositive(timeout);
            Objects.requireNonNull(ticker, "ticker");
        }

        void validate() {
            if (!capability.writableManagedConfig()
                    || !owner.isValid()
                    || !root.equals(owner.installationRoot().toAbsolutePath().normalize())) {
                throw new IllegalArgumentException("Migration runtime admission is unavailable");
            }
        }
    }

    @FunctionalInterface
    interface Cleanup {
        void run();
    }

    private enum ClosePhase {
        ADMISSION,
        COMMANDS,
        INSPECTOR,
        COPY_EXECUTOR,
        FACTORY,
        CLOSED
    }
}
