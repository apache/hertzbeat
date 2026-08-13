/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;

/** Bounded JDBC connection, dialect/charset, schema access, and temporary DDL/DML probe. */
public final class JdbcMetadataConnectionProbe implements MetadataConnectionProbe {
    private static final int MAX_CONCURRENT_PROBES = 2;
    private static final int MAX_QUEUED_PROBES = 4;
    private static final ThreadPoolExecutor SHARED_EXECUTOR = new ThreadPoolExecutor(
            MAX_CONCURRENT_PROBES, MAX_CONCURRENT_PROBES, 0L, TimeUnit.MILLISECONDS,
            new ArrayBlockingQueue<>(MAX_QUEUED_PROBES), task -> {
                Thread thread = new Thread(task, "setup-metadata-probe");
                thread.setDaemon(true);
                return thread;
            }, new ThreadPoolExecutor.AbortPolicy());
    private final Duration timeout;
    private final ThreadPoolExecutor executor;
    private final Executor cleanupExecutor;
    private final JdbcConnector connector;

    public JdbcMetadataConnectionProbe(Duration timeout) {
        this(timeout, SHARED_EXECUTOR, JdbcMetadataProbeCleanup.sharedExecutor(), (url, username, password) ->
                DriverManager.getConnection(url, username, new String(password)));
    }

    JdbcMetadataConnectionProbe(Duration timeout, ThreadPoolExecutor executor, JdbcConnector connector) {
        this(timeout, executor, Runnable::run, connector);
    }

    JdbcMetadataConnectionProbe(Duration timeout, ThreadPoolExecutor executor,
                                Executor cleanupExecutor, JdbcConnector connector) {
        this.timeout = timeout;
        this.executor = executor;
        this.cleanupExecutor = cleanupExecutor;
        this.connector = connector;
    }

    @Override
    public Optional<SetupErrorCode> probe(MetadataConnectionProbe.Request configuration) {
        return new JdbcMetadataProbeSession(
                configuration, timeout, executor, cleanupExecutor, connector).probe();
    }

    @FunctionalInterface
    interface JdbcConnector {
        Connection connect(String url, String username, char[] password) throws SQLException;
    }
}
