/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.concurrent.Executor;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/** Process-lifetime bounded daemon executor for JDBC abort calls that may outlive a runtime. */
final class TargetJdbcAbortExecutor {

    private static final Executor INSTANCE = new ThreadPoolExecutor(
            0, 2, 30, TimeUnit.SECONDS, new SynchronousQueue<>(), runnable -> {
                Thread thread = new Thread(runnable, "target-jdbc-abort");
                thread.setDaemon(true);
                return thread;
            }, new ThreadPoolExecutor.AbortPolicy());

    private TargetJdbcAbortExecutor() {
    }

    static Executor instance() {
        return INSTANCE;
    }
}
