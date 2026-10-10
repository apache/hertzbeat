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
import java.sql.SQLException;
import java.util.Arrays;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Runs exact-candidate cleanup outside the capacity-limited primary probe executor. */
final class JdbcMetadataProbeCleanup {
    private static final Logger LOGGER = LoggerFactory.getLogger(JdbcMetadataConnectionProbe.class);
    private static final int MAX_CONCURRENT_CLEANUPS = 1;
    private static final ThreadPoolExecutor CLEANUP_EXECUTOR = new ThreadPoolExecutor(
            MAX_CONCURRENT_CLEANUPS, MAX_CONCURRENT_CLEANUPS, 0L, TimeUnit.MILLISECONDS,
            new SynchronousQueue<>(), task -> {
                Thread thread = new Thread(task, "setup-metadata-probe-cleanup");
                thread.setDaemon(true);
                return thread;
            }, new ThreadPoolExecutor.AbortPolicy());
    private final MetadataConnectionProbe.Request request;
    private final long timeoutNanos;
    private final Executor cleanupExecutor;
    private final JdbcMetadataConnectionProbe.JdbcConnector connector;
    private final JdbcMetadataProbeOperations operations = new JdbcMetadataProbeOperations();

    JdbcMetadataProbeCleanup(MetadataConnectionProbe.Request request, long timeoutNanos,
                             Executor cleanupExecutor, JdbcMetadataConnectionProbe.JdbcConnector connector) {
        this.request = request;
        this.timeoutNanos = timeoutNanos;
        this.cleanupExecutor = cleanupExecutor;
        this.connector = connector;
    }

    void schedule(String table, char[] sourcePassword, Runnable confirmed) {
        char[] password = Arrays.copyOf(sourcePassword, sourcePassword.length);
        try {
            // Zero queue capacity prevents cleartext credential copies from waiting behind a stuck connector.
            cleanupExecutor.execute(() -> cleanup(table, password, confirmed));
        } catch (RejectedExecutionException overload) {
            Arrays.fill(password, '\0');
            logFailure(table, null, 0);
        }
    }

    static Executor sharedExecutor() {
        return CLEANUP_EXECUTOR;
    }

    private void cleanup(String table, char[] password, Runnable confirmed) {
        Thread.interrupted();
        long deadline = JdbcMetadataProbeOperations.deadlineAfter(timeoutNanos);
        // JDBC connect has no portable hard timeout; isolation keeps this best-effort wait out of the probe pool.
        try (Connection connection = connector.connect(request.jdbcUrl(), request.username(), password)) {
            operations.configureConnection(connection, deadline);
            connection.setAutoCommit(false);
            operations.dropIfExists(connection, table, () -> deadline);
            connection.commit();
            confirmed.run();
        } catch (SQLException failure) {
            logFailure(table, failure.getSQLState(), failure.getErrorCode());
        } catch (RuntimeException failure) {
            logFailure(table, null, 0);
        } finally {
            Arrays.fill(password, '\0');
        }
    }

    private void logFailure(String table, String sqlState, int vendorCode) {
        LOGGER.warn("Metadata probe cleanup failure kind={} table={} sqlState={} vendorCode={}",
                request.kind(), table, safeSqlState(sqlState), vendorCode);
    }

    private static String safeSqlState(String sqlState) {
        if (sqlState == null || sqlState.length() != 5) {
            return "unknown";
        }
        return sqlState.chars().allMatch(character -> character >= '0' && character <= '9'
                        || character >= 'A' && character <= 'Z')
                ? sqlState : "unknown";
    }
}
