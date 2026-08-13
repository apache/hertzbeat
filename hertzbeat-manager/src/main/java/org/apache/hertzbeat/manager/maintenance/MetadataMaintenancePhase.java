/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

/** Lifecycle of process-local metadata producer admission. */
public enum MetadataMaintenancePhase {
    RUNNING,
    QUIESCING,
    QUIESCED,
    RECOVERY_REQUIRED
}
