/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.sql.SQLException;
import java.sql.SQLNonTransientConnectionException;
import java.sql.SQLRecoverableException;
import java.sql.SQLTimeoutException;
import java.sql.SQLTransientConnectionException;

/** Classifies JDBC failures without retaining driver messages or connection details. */
final class TargetSchemaSqlFailure {

    private TargetSchemaSqlFailure() {
    }

    static boolean isTimeout(SQLException failure) {
        String state = failure.getSQLState();
        return failure instanceof SQLTimeoutException
                || "HYT00".equals(state)
                || "HYT01".equals(state)
                || "57014".equals(state);
    }

    static boolean invalidatesConnection(SQLException failure) {
        String state = failure.getSQLState();
        return isTimeout(failure)
                || failure instanceof SQLTransientConnectionException
                || failure instanceof SQLNonTransientConnectionException
                || failure instanceof SQLRecoverableException
                || state != null && state.startsWith("08");
    }
}
