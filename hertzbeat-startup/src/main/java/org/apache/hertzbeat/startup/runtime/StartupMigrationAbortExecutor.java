/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.startup.runtime;

import java.util.concurrent.Executor;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/** Process-lifetime bounded daemon lanes for JDBC abort callbacks retained beyond session close. */
final class StartupMigrationAbortExecutor {

    private static final Executor PROCESS_LIFETIME = new ThreadPoolExecutor(
            2, 2, 0L, TimeUnit.MILLISECONDS, new SynchronousQueue<>(),
            Thread.ofPlatform().daemon().name("hertzbeat-migration-abort-", 0).factory(),
            new ThreadPoolExecutor.AbortPolicy());

    private StartupMigrationAbortExecutor() {
    }

    static Executor processLifetime() {
        return PROCESS_LIFETIME;
    }
}
