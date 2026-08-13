/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.startup.runtime;

import org.apache.hertzbeat.manager.setup.workflow.ManagedMigrationStartupRecoveryDisposition;

/** One owner-bound, long-lived migration recovery session used before Spring starts. */
interface StartupMigrationRecoveryPreflight extends AutoCloseable {

    ManagedMigrationStartupRecoveryDisposition reconcile();

    @Override
    void close();
}
