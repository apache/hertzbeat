/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.Objects;
import java.time.Duration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Credential-free vendor DataSource settings for one connection attempt. */
record TargetJdbcDataSourceSettings(
        MetadataDatabaseKind kind,
        String jdbcUrl,
        Duration remaining) {

    TargetJdbcDataSourceSettings {
        Objects.requireNonNull(kind, "kind");
        Objects.requireNonNull(jdbcUrl, "jdbcUrl");
        Objects.requireNonNull(remaining, "remaining");
        if (remaining.isZero() || remaining.isNegative()) {
            throw new IllegalArgumentException("Invalid target JDBC timeout settings");
        }
    }

    @Override
    public String toString() {
        return "TargetJdbcDataSourceSettings[kind=" + kind + ']';
    }
}
