/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.sql.SQLException;
import java.sql.Statement;
import java.util.Objects;
import java.util.concurrent.TimeUnit;

/** Applies one exact monotonic deadline to cooperative JDBC schema operations. */
final class TargetSchemaJdbcBudget {

    private final JdbcMetadataMigrationDeadline deadline;
    private final int fixedSeconds;

    TargetSchemaJdbcBudget(JdbcMetadataMigrationDeadline deadline) {
        this.deadline = Objects.requireNonNull(deadline, "deadline");
        this.fixedSeconds = 0;
    }

    private TargetSchemaJdbcBudget(int fixedSeconds) {
        this.deadline = null;
        this.fixedSeconds = Math.max(0, fixedSeconds);
    }

    static TargetSchemaJdbcBudget none() {
        return new TargetSchemaJdbcBudget(0);
    }

    static TargetSchemaJdbcBudget fixed(int seconds) {
        return new TargetSchemaJdbcBudget(seconds);
    }

    void check() {
        if (Thread.currentThread().isInterrupted()) {
            throw new MetadataMigrationException(MetadataMigrationErrorCode.TIMEOUT);
        }
        if (deadline != null) {
            deadline.remainingDuration();
        }
    }

    void apply(Statement statement) throws SQLException {
        Objects.requireNonNull(statement, "statement");
        check();
        if (deadline == null) {
            if (fixedSeconds > 0) {
                statement.setQueryTimeout(fixedSeconds);
            }
            check();
            return;
        }
        long remaining = deadline.remainingNanos();
        if (remaining <= 0) {
            throw new MetadataMigrationException(MetadataMigrationErrorCode.TIMEOUT);
        }
        long seconds = TimeUnit.NANOSECONDS.toSeconds(remaining);
        if (remaining % TimeUnit.SECONDS.toNanos(1) != 0) {
            seconds++;
        }
        statement.setQueryTimeout((int) Math.min(Integer.MAX_VALUE, Math.max(1, seconds)));
        check();
    }
}
