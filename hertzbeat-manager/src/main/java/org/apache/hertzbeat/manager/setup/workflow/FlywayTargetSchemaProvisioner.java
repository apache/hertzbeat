/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.time.Duration;
import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Compatibility adapter around caller-owned, deadline-aware target schema provisioning. */
public final class FlywayTargetSchemaProvisioner implements TargetSchemaProvisioner {

    private static final Duration COMPATIBILITY_TIMEOUT = Duration.ofMinutes(5);

    @Override
    public void provision(MetadataDatabaseConfiguration target) {
        Objects.requireNonNull(target, "target");
        MetadataDatabaseKind kind = supportedKind(target.kind());
        Connection connection;
        try {
            connection = DriverManager.getConnection(target.jdbcUrl(), target.username(), target.password());
        } catch (SQLException failure) {
            throw failure(kind, TargetSchemaProvisioningFailure.Phase.CONNECTION, failure);
        }
        provisionOwned(connection, kind, () -> provision(connection, kind,
                JdbcMetadataMigrationDeadline.start(COMPATIBILITY_TIMEOUT, System::nanoTime)));
    }

    /** Provisions without opening, closing, or retaining the caller-owned connection. */
    TargetSchemaProvisioningOutcome provision(
            Connection connection,
            MetadataDatabaseKind kind,
            JdbcMetadataMigrationDeadline deadline) {
        MetadataDatabaseKind supported = supportedKind(kind);
        return new FlywayTargetSchemaProvisioningCore(new FlywayTargetSchemaProvisioningWork(supported))
                .provision(connection, supported, deadline);
    }

    void provisionOwned(Connection connection, MetadataDatabaseKind kind, Runnable action) {
        Objects.requireNonNull(connection, "connection");
        Objects.requireNonNull(action, "action");
        Throwable primary = null;
        try {
            action.run();
        } catch (RuntimeException failure) {
            primary = failure;
            throw failure;
        } catch (Error failure) {
            primary = failure;
            throw failure;
        } finally {
            closeOwned(connection, supportedKind(kind), primary);
        }
    }

    private static void closeOwned(
            Connection connection,
            MetadataDatabaseKind kind,
            Throwable primary) {
        try {
            connection.close();
        } catch (SQLException | RuntimeException closeFailure) {
            if (primary == null) {
                throw failure(kind, TargetSchemaProvisioningFailure.Phase.CLEANUP, closeFailure);
            }
        } catch (Error closeFatal) {
            if (primary == null) {
                throw closeFatal;
            }
        }
    }

    private static TargetSchemaProvisioningException failure(
            MetadataDatabaseKind kind,
            TargetSchemaProvisioningFailure.Phase phase,
            Throwable cause) {
        return new TargetSchemaProvisioningException(
                kind,
                TargetSchemaProvisioningFailure.from(phase, cause),
                TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
    }

    private static MetadataDatabaseKind supportedKind(MetadataDatabaseKind kind) {
        return switch (Objects.requireNonNull(kind, "target kind")) {
            case MYSQL -> MetadataDatabaseKind.MYSQL;
            case POSTGRESQL -> MetadataDatabaseKind.POSTGRESQL;
            case H2 -> throw new IllegalArgumentException("External target schema provisioning does not support H2");
        };
    }
}
