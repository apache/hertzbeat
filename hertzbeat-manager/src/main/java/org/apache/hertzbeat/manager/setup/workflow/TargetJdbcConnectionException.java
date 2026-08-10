/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

/** Cause-free target connection failure safe for workflow and API translation. */
final class TargetJdbcConnectionException extends RuntimeException {

    private final TargetJdbcConnectionErrorCode code;

    TargetJdbcConnectionException(TargetJdbcConnectionErrorCode code) {
        super("Target JDBC connection failed: " + code.name().toLowerCase(java.util.Locale.ROOT));
        this.code = java.util.Objects.requireNonNull(code, "code");
    }

    TargetJdbcConnectionErrorCode code() {
        return code;
    }
}
