/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

/** Stable, credential-free failures for target JDBC connection ownership. */
enum TargetJdbcConnectionErrorCode {
    TIMEOUT,
    UNAVAILABLE,
    TARGET_MISMATCH,
    OPERATION_CONFLICT,
    FACTORY_CLOSED,
    CLEANUP_REQUIRED
}
