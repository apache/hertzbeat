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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.junit.jupiter.api.Test;

class JdbcMetadataConnectionProbeTest {

    @Test
    void h2ProbePerformsRealConnectionAndTemporaryDdlDmlCleanup() throws Exception {
        String url = "jdbc:h2:mem:setup_validation;DB_CLOSE_DELAY=-1";
        var configuration = new MetadataDatabaseConfiguration(
                MetadataDatabaseKind.H2, url, "sa", "password");

        assertThat(new JdbcMetadataConnectionProbe(Duration.ofSeconds(30)).probe(configuration)).isEmpty();
        try (var connection = java.sql.DriverManager.getConnection(url, "sa", "password");
             var result = connection.getMetaData().getTables(null, null, "HZB_SETUP_PROBE_%", null)) {
            assertThat(result.next()).isFalse();
        }
    }

    @Test
    void productMismatchHasStableSchemaError() {
        var configuration = new MetadataDatabaseConfiguration(
                MetadataDatabaseKind.MYSQL, "jdbc:h2:mem:setup_wrong_kind", "sa", "password");

        assertThat(new JdbcMetadataConnectionProbe(Duration.ofSeconds(10)).probe(configuration))
                .contains(SetupErrorCode.METADATA_SCHEMA_MISMATCH);
    }

    @Test
    void blockingDriverCannotGrowProbeThreadsOrQueueWithoutBound() {
        ThreadPoolExecutor executor = new ThreadPoolExecutor(2, 2, 0L, TimeUnit.MILLISECONDS,
                new ArrayBlockingQueue<>(1), Thread.ofPlatform().name("bounded-probe-", 0).factory(),
                new ThreadPoolExecutor.AbortPolicy());
        CountDownLatch release = new CountDownLatch(1);
        JdbcMetadataConnectionProbe probe = new JdbcMetadataConnectionProbe(
                Duration.ofMillis(100), executor, (url, username, password) -> {
                    while (release.getCount() > 0) {
                        try {
                            release.await();
                        } catch (InterruptedException ignored) {
                            // Emulate a driver that ignores interruption while connecting.
                        }
                    }
                    throw new java.sql.SQLException("released");
                });
        var configuration = new MetadataDatabaseConfiguration(
                MetadataDatabaseKind.H2, "jdbc:h2:mem:blocked", "sa", "password");
        List<CompletableFuture<java.util.Optional<SetupErrorCode>>> calls = new ArrayList<>();
        try {
            for (int index = 0; index < 8; index++) {
                calls.add(CompletableFuture.supplyAsync(() -> probe.probe(configuration)));
            }
            calls.forEach(call -> assertThat(call.join()).contains(SetupErrorCode.METADATA_CONNECTION_FAILED));
            assertThat(executor.getLargestPoolSize()).isEqualTo(2);
            assertThat(executor.getQueue().size()).isLessThanOrEqualTo(1);
        } finally {
            release.countDown();
            executor.shutdownNow();
        }
    }

    @Test
    void successfulTransactionalDdlDropsBeforeCommitWithoutRollback() throws Exception {
        Connection connection = mock(Connection.class);
        Statement statement = mock(Statement.class);
        ResultSet result = mock(ResultSet.class);
        when(connection.createStatement()).thenReturn(statement);
        when(statement.executeQuery(contains("SELECT probe_value"))).thenReturn(result);
        when(result.next()).thenReturn(true);
        when(result.getString(1)).thenReturn("updated");

        assertThat(new JdbcMetadataConnectionProbe(Duration.ofSeconds(1))
                .validatePrivileges(connection)).isEmpty();

        var order = inOrder(statement, connection);
        order.verify(statement).execute(contains("CREATE TABLE"));
        order.verify(statement).execute(contains("DROP TABLE"));
        order.verify(connection).commit();
        org.mockito.Mockito.verify(connection, org.mockito.Mockito.never()).rollback();
    }
}
