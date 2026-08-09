/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

import java.time.Duration;

/** Acquires the complete process-local maintenance window required before metadata migration. */
public interface MigrationMaintenanceOrchestrator {

    MigrationMaintenanceLease acquire(String operationId, Duration timeout);
}
