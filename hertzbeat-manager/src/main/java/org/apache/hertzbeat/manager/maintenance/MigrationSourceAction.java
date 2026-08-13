/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

import java.sql.Connection;

/** Synchronous work scoped to the exact metadata source held by a maintenance lease. */
@FunctionalInterface
public interface MigrationSourceAction {

    /**
     * Uses the guarded source only for this callback. The action must not retain, replace, or
     * independently close the connection. Only the bounded JDBC migration executor may invalidate
     * it on a fail-closed timeout or unknown-outcome path; final ownership remains with the lease.
     */
    void execute(Connection source);
}
