/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

/** Owner capability for one fully acquired migration maintenance window. */
public interface MigrationMaintenanceLease extends AutoCloseable {

    /** Runs synchronous work against the exact source fenced by this maintenance window. */
    void withSourceConnection(MigrationSourceAction action);

    @Override
    void close();
}
