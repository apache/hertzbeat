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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.slf4j.LoggerFactory;

class JdbcMetadataProbeCleanupBoundaryTest {

    @Test
    void occupiedZeroQueueCleanupRejectsSecondCandidateWithoutAnotherConnection() throws Exception {
        assertThat(((ThreadPoolExecutor) JdbcMetadataProbeCleanup.sharedExecutor()).getQueue().remainingCapacity())
                .isZero();
        ThreadPoolExecutor cleanupExecutor = cleanupExecutor();
        CountDownLatch connecting = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        AtomicInteger connections = new AtomicInteger();
        Connection connection = mock(Connection.class);
        when(connection.createStatement()).thenReturn(mock(Statement.class));
        Logger logger = (Logger) LoggerFactory.getLogger(JdbcMetadataConnectionProbe.class);
        ListAppender<ILoggingEvent> appender = appender(logger);
        try (var request = request("jdbc:h2:mem:zero-queue")) {
            JdbcMetadataProbeCleanup cleanup = new JdbcMetadataProbeCleanup(
                    request, Duration.ofSeconds(1).toNanos(), cleanupExecutor, (url, username, password) -> {
                        connections.incrementAndGet();
                        connecting.countDown();
                        while (release.getCount() > 0) {
                            try {
                                release.await();
                            } catch (InterruptedException ignored) {
                                // Emulate a cleanup connector that ignores interruption.
                            }
                        }
                        return connection;
                    });
            cleanup.schedule("HZB_SETUP_PROBE_FIRST", "first-secret".toCharArray(), () -> { });
            assertThat(connecting.await(1, TimeUnit.SECONDS)).isTrue();
            cleanup.schedule("HZB_SETUP_PROBE_SECOND", "second-secret".toCharArray(), () -> { });

            assertThat(connections).hasValue(1);
            ILoggingEvent warning = appender.list.stream()
                    .filter(event -> event.getLevel() == Level.WARN).findFirst().orElseThrow();
            assertThat(warning.getFormattedMessage())
                    .isEqualTo("Metadata probe cleanup failure kind=H2 table=HZB_SETUP_PROBE_SECOND "
                            + "sqlState=unknown vendorCode=0")
                    .doesNotContain("secret");
        } finally {
            release.countDown();
            logger.detachAppender(appender);
            appender.stop();
            cleanupExecutor.shutdownNow();
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"cleanupsecret", "é0806", "ab123", "08-01"})
    void invalidSqlStateIsLoggedAsUnknown(String sqlState) throws Exception {
        Logger logger = (Logger) LoggerFactory.getLogger(JdbcMetadataConnectionProbe.class);
        ListAppender<ILoggingEvent> appender = appender(logger);
        try (var request = request("jdbc:h2:mem:invalid-state")) {
            JdbcMetadataProbeCleanup cleanup = new JdbcMetadataProbeCleanup(
                    request, Duration.ofSeconds(1).toNanos(), Runnable::run,
                    (url, username, password) -> {
                        throw new SQLException("exception-secret", sqlState, 91);
                    });
            cleanup.schedule("HZB_SETUP_PROBE_STATE", "password-secret".toCharArray(), () -> { });

            ILoggingEvent warning = appender.list.getFirst();
            assertThat(warning.getFormattedMessage())
                    .isEqualTo("Metadata probe cleanup failure kind=H2 table=HZB_SETUP_PROBE_STATE "
                            + "sqlState=unknown vendorCode=91")
                    .doesNotContain(sqlState, "exception-secret", "password-secret");
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }

    private static MetadataConnectionProbe.Request request(String url) {
        return new MetadataConnectionProbe.Request(
                MetadataDatabaseKind.H2, url, "sa", SecretValue.of("password"));
    }

    private static ThreadPoolExecutor cleanupExecutor() {
        return new ThreadPoolExecutor(1, 1, 0L, TimeUnit.MILLISECONDS,
                new SynchronousQueue<>(), Thread.ofPlatform().name("cleanup-test-", 0).factory(),
                new ThreadPoolExecutor.AbortPolicy());
    }

    private static ListAppender<ILoggingEvent> appender(Logger logger) {
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        return appender;
    }
}
