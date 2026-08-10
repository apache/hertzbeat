/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.TargetInspection;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;

/** Borrows the one target factory and retains only exact unresolved cleanup ownership. */
final class MetadataMigrationTargetInspector {

    private final TargetJdbcConnectionFactory factory;
    private final TargetSchemaReadOnlyInspector schema;
    private TargetJdbcConnectionLease pendingLease;
    private Error pendingFatal;
    private boolean pendingAcquire;
    private boolean shutdown;

    MetadataMigrationTargetInspector(
            TargetJdbcConnectionFactory factory,
            TargetSchemaReadOnlyInspector schema) {
        this.factory = Objects.requireNonNull(factory, "factory");
        this.schema = Objects.requireNonNull(schema, "schema");
    }

    synchronized TargetInspection inspect(
            MetadataDatabaseSettings settings,
            SecretValue borrowedPassword,
            JdbcMetadataMigrationDeadline deadline) {
        Objects.requireNonNull(settings, "settings");
        Objects.requireNonNull(borrowedPassword, "borrowedPassword");
        Objects.requireNonNull(deadline, "deadline");
        if (shutdown || hasPendingCleanup()) {
            return TargetInspection.UNKNOWN;
        }
        TargetJdbcConnectionLease lease;
        try {
            lease = factory.acquire(settings, borrowedPassword, deadline);
        } catch (TargetJdbcConnectionException failure) {
            pendingAcquire = mayOwnFailedAcquire(failure.code());
            return TargetInspection.UNKNOWN;
        } catch (MetadataMigrationException failure) {
            pendingAcquire = true;
            return TargetInspection.UNKNOWN;
        } catch (RuntimeException failure) {
            pendingAcquire = true;
            return TargetInspection.UNKNOWN;
        } catch (Error fatal) {
            pendingAcquire = true;
            pendingFatal = fatal;
            throw fatal;
        }
        InspectionHolder result = inspectLease(lease, settings, deadline);
        return closeLease(lease, result);
    }

    synchronized void retryCleanup(JdbcMetadataMigrationDeadline deadline) {
        Objects.requireNonNull(deadline, "deadline");
        if (pendingLease != null) {
            retryLeaseClose();
            return;
        }
        if (!pendingAcquire) {
            return;
        }
        try {
            factory.settleFailedAcquire(deadline);
        } catch (RuntimeException failure) {
            throw new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED);
        } catch (Error fatal) {
            if (pendingFatal == null) {
                pendingFatal = fatal;
            }
            throw pendingFatal;
        }
        Error fatal = pendingFatal;
        pendingAcquire = false;
        pendingFatal = null;
        if (fatal != null) {
            throw fatal;
        }
    }

    synchronized void shutdown(JdbcMetadataMigrationDeadline deadline) {
        shutdown = true;
        retryCleanup(deadline);
    }

    @Override
    public synchronized String toString() {
        return "MetadataMigrationTargetInspector[shutdown=" + shutdown
                + ", pendingCleanup=" + hasPendingCleanup() + ']';
    }

    private InspectionHolder inspectLease(
            TargetJdbcConnectionLease lease,
            MetadataDatabaseSettings settings,
            JdbcMetadataMigrationDeadline deadline) {
        InspectionHolder result = new InspectionHolder();
        try {
            lease.withConnection(connection -> result.inspection =
                    schema.inspect(connection, settings.kind(), deadline));
        } catch (RuntimeException failure) {
            result.inspection = TargetInspection.UNKNOWN;
        } catch (Error fatal) {
            result.fatal = fatal;
        }
        return result;
    }

    private TargetInspection closeLease(
            TargetJdbcConnectionLease lease,
            InspectionHolder result) {
        try {
            lease.close();
        } catch (RuntimeException failure) {
            retainLease(lease, result.fatal);
            if (result.fatal != null) {
                throw result.fatal;
            }
            return TargetInspection.UNKNOWN;
        } catch (Error fatal) {
            Error primary = result.fatal == null ? fatal : result.fatal;
            retainLease(lease, primary);
            throw primary;
        }
        if (result.fatal != null) {
            throw result.fatal;
        }
        return result.inspection;
    }

    private void retryLeaseClose() {
        try {
            pendingLease.close();
        } catch (RuntimeException failure) {
            throw new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED);
        } catch (Error fatal) {
            if (pendingFatal == null) {
                pendingFatal = fatal;
            }
            throw pendingFatal;
        }
        Error fatal = pendingFatal;
        pendingLease = null;
        pendingFatal = null;
        if (fatal != null) {
            throw fatal;
        }
    }

    private void retainLease(TargetJdbcConnectionLease lease, Error fatal) {
        pendingLease = lease;
        pendingFatal = fatal;
    }

    private boolean hasPendingCleanup() {
        return pendingLease != null || pendingAcquire;
    }

    private static boolean mayOwnFailedAcquire(TargetJdbcConnectionErrorCode code) {
        return switch (code) {
            case TIMEOUT, UNAVAILABLE, CLEANUP_REQUIRED -> true;
            case TARGET_MISMATCH, OPERATION_CONFLICT, FACTORY_CLOSED -> false;
        };
    }

    private static final class InspectionHolder {

        private TargetInspection inspection = TargetInspection.UNKNOWN;
        private Error fatal;
    }
}
