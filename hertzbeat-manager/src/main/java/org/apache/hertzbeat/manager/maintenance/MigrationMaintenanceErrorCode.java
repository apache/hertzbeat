/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

/** Stable safe failure categories for migration maintenance acquisition and release. */
public enum MigrationMaintenanceErrorCode {
    MIGRATION_DEPLOYMENT_AUTHORITY_UNAVAILABLE,
    MIGRATION_SOURCE_UNAVAILABLE,
    MIGRATION_MULTI_NODE_UNSUPPORTED,
    MIGRATION_OPERATION_CONFLICT,
    MIGRATION_MAINTENANCE_TIMEOUT,
    MIGRATION_MAINTENANCE_INTERRUPTED,
    MIGRATION_MAINTENANCE_FAILURE,
    MIGRATION_RESUME_FAILURE,
    INVALID_REQUEST
}
