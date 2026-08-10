/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.sql.SQLException;
import java.util.Locale;
import java.util.Objects;
import java.util.regex.Pattern;

/** Stable failure fields suitable for a durable setup-operation diagnostic. */
public record TargetSchemaProvisioningFailure(
        Phase phase,
        String migrationVersion,
        String sqlState,
        int vendorCode) {

    private static final Pattern SQL_STATE = Pattern.compile("[0-9A-Z]{5}");

    public TargetSchemaProvisioningFailure {
        Objects.requireNonNull(phase, "phase");
        Objects.requireNonNull(migrationVersion, "migrationVersion");
    }

    static TargetSchemaProvisioningFailure from(Phase phase, Throwable exception) {
        SQLException sqlException = findSqlException(exception);
        return new TargetSchemaProvisioningFailure(
                phase,
                TargetSchemaBaseline.VERSION,
                sqlException == null ? null : sanitizedSqlState(sqlException.getSQLState()),
                sqlException == null ? 0 : sqlException.getErrorCode());
    }

    private static String sanitizedSqlState(String sqlState) {
        if (sqlState == null) {
            return null;
        }
        String normalized = sqlState.toUpperCase(Locale.ROOT);
        return SQL_STATE.matcher(normalized).matches() ? normalized : null;
    }

    private static SQLException findSqlException(Throwable exception) {
        Throwable current = exception;
        for (int depth = 0; current != null && depth < 16; depth++) {
            if (current instanceof SQLException sqlException) {
                return sqlException;
            }
            current = current.getCause();
        }
        return null;
    }

    /** Lifecycle boundary that failed without retaining an exception or SQL text. */
    public enum Phase {
        CONNECTION,
        BASELINE_RESOURCE,
        PRECONDITION,
        BASELINE_EXECUTION,
        HISTORY_WRITE,
        TRANSACTION,
        CLEANUP,
        DEADLINE,
        COMMIT_OUTCOME_UNKNOWN,
        ROLLBACK_OUTCOME_UNKNOWN
    }
}
