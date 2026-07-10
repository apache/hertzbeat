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

package org.apache.hertzbeat.collector.collect.database;

import org.apache.hertzbeat.collector.collect.common.cache.CacheIdentifier;
import org.apache.hertzbeat.collector.collect.common.cache.GlobalConnectionCache;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.JdbcProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Test case for {@link JdbcCommonCollect}
 */
class JdbcCommonCollectTest {
    private JdbcCommonCollect jdbcCommonCollect;

    @BeforeEach
    void setup() {
        jdbcCommonCollect = new JdbcCommonCollect();
    }

    @Test
    void preCheck() {
        assertThrows(IllegalArgumentException.class, () -> {
            jdbcCommonCollect.preCheck(null);
        });
        assertThrows(IllegalArgumentException.class, () -> {
            Metrics metrics = new Metrics();
            jdbcCommonCollect.preCheck(metrics);
        });

        assertDoesNotThrow(() -> {
            JdbcProtocol jdbc = new JdbcProtocol();
            jdbc.setUrl("jdbc:mysql://localhost:3306/test");

            Metrics metrics = new Metrics();
            metrics.setJdbc(jdbc);
            jdbcCommonCollect.preCheck(metrics);
        });

        String[] invalidKeywords = new String[]{
            "allowLoadLocalInfile", "allowLoadLocalInfileInPath", "useLocalInfile"
        };
        for (String keyword : invalidKeywords) {
            // contains not allowed keywords
            assertThrows(IllegalArgumentException.class, () -> {
                JdbcProtocol jdbc = new JdbcProtocol();
                jdbc.setUrl("jdbc:mysql://localhost:3306/test?" + keyword);
    
                Metrics metrics = new Metrics();
                metrics.setJdbc(jdbc);
                jdbcCommonCollect.preCheck(metrics);
            });
        }
    }

    @Test
    void collect() {
        assertDoesNotThrow(() -> {
            JdbcProtocol jdbc = new JdbcProtocol();
            jdbc.setUrl("jdbc:mysql://localhost:3306/test");
            jdbc.setUsername("root");
            jdbc.setPassword("123456");
            jdbc.setQueryType("select");

            Metrics metrics = new Metrics();
            metrics.setJdbc(jdbc);

            CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
            jdbcCommonCollect.collect(builder, metrics);
        });
    }

    @Test
    void supportProtocol() {
        String protocol = jdbcCommonCollect.supportProtocol();
        assertEquals(DispatchConstants.PROTOCOL_JDBC, protocol);
    }

    @Test
    void testUrlPassThrough() {
        String[] testUrls = {
                "jdbc:mysql://localhost:3306/test?allowPublicKeyRetrieval=true&useSSL=false",
                "jdbc:mysql://localhost:3306/test?usessl=false&verifyServerCertificate=true",
                "jdbc:mysql://localhost:3306/test?serverTimezone=UTC&autoReconnect=false"
        };
        JdbcCommonCollect jdbcCollect = new JdbcCommonCollect();
        for (String originalUrl : testUrls) {
            try {
                JdbcProtocol jdbcProtocol = JdbcProtocol.builder()
                        .host("localhost")
                        .port("3306")
                        .platform("mysql")
                        .username("root")
                        .password("root")
                        .database("test")
                        .url(originalUrl)
                        .build();

                String processedUrl = constructDatabaseUrl(jdbcCollect, jdbcProtocol, "localhost", "3306");
                // Verify that the processed URL is the same as the original URL
                assertEquals(originalUrl, processedUrl,
                    "URL should be passed through without modification: " + originalUrl);
            } catch (Exception e) {
                System.out.println("URL rejected by security validation: " + originalUrl + ", reason: " + e.getMessage());
            }
        }
    }

    @Test
    void testConstructDatabaseUrlByPlatform() throws Exception {
        Map<String, String> expectedUrls = new LinkedHashMap<>();
        expectedUrls.put("mysql", "jdbc:mysql://localhost:3306/test?useUnicode=true&characterEncoding=utf-8&useSSL=false");
        expectedUrls.put("mariadb", "jdbc:mysql://localhost:3306/test?useUnicode=true&characterEncoding=utf-8&useSSL=false");
        expectedUrls.put("postgresql", "jdbc:postgresql://localhost:3306/test");
        expectedUrls.put("clickhouse", "jdbc:clickhouse://localhost:3306/test");
        expectedUrls.put("sqlserver", "jdbc:sqlserver://localhost:3306;DatabaseName=test;trustServerCertificate=true;");
        expectedUrls.put("oracle", "jdbc:oracle:thin:@localhost:3306/test");
        expectedUrls.put("dm", "jdbc:dm://localhost:3306");

        for (Map.Entry<String, String> entry : expectedUrls.entrySet()) {
            JdbcProtocol jdbcProtocol = JdbcProtocol.builder()
                    .platform(entry.getKey())
                    .database("test")
                    .build();

            assertEquals(entry.getValue(), constructDatabaseUrl(jdbcCommonCollect, jdbcProtocol, "localhost", "3306"));
        }
    }

    @Test
    void testConstructDatabaseUrlRejectsUnsupportedPlatform() {
        JdbcProtocol jdbcProtocol = JdbcProtocol.builder()
                .platform("invalid")
                .database("test")
                .build();

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> constructDatabaseUrl(jdbcCommonCollect, jdbcProtocol, "localhost", "3306"));
        assertEquals("Not support database platform: invalid", exception.getMessage());
    }

    @Test
    void testCloseConnectionWhenCreateStatementFails() throws Exception {
        String url = "jdbc:postgresql://localhost:5432/hertzbeat";
        String username = "root";
        String password = "root";
        Connection connection = mock(Connection.class);
        when(connection.createStatement()).thenThrow(new SQLException("create statement failed"));

        try (MockedStatic<DriverManager> driverManager = mockStatic(DriverManager.class)) {
            driverManager.when(() -> DriverManager.getConnection(url, username, password)).thenReturn(connection);

            SQLException exception = assertThrows(SQLException.class,
                    () -> getConnection(jdbcCommonCollect, username, password, url, 1000, false));

            assertEquals("create statement failed", exception.getMessage());
            verify(connection).close();
        }
    }

    @Test
    void testReuseConnectionSerializesCreationForSameIdentifier() throws Exception {
        String url = "jdbc:hertzbeat-test:concurrent";
        String username = "root";
        String password = "root";
        Connection firstConnection = mock(Connection.class);
        Connection secondConnection = mock(Connection.class);
        Statement firstStatement = mock(Statement.class);
        Statement reusedStatement = mock(Statement.class);
        when(firstConnection.createStatement()).thenReturn(firstStatement, reusedStatement);
        when(secondConnection.createStatement()).thenReturn(mock(Statement.class));

        BlockingJdbcCommonCollect collect = new BlockingJdbcCommonCollect(firstConnection, secondConnection);
        CacheIdentifier identifier = CacheIdentifier.builder()
                .ip(url).username(username).password(password).build();
        GlobalConnectionCache.getInstance().removeCache(identifier);

        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<Statement> first = executor.submit(() -> getConnection(collect, username, password, url, 1000, true));
            assertTrue(collect.firstOpenStarted.await(5, TimeUnit.SECONDS));

            CountDownLatch secondTaskStarted = new CountDownLatch(1);
            Future<Statement> second = executor.submit(() -> {
                secondTaskStarted.countDown();
                return getConnection(collect, username, password, url, 1000, true);
            });
            assertTrue(secondTaskStarted.await(5, TimeUnit.SECONDS));
            boolean secondPhysicalConnectionOpened = collect.secondOpenStarted.await(1, TimeUnit.SECONDS);
            collect.allowFirstOpen.countDown();

            assertSame(firstStatement, first.get(5, TimeUnit.SECONDS));
            assertSame(reusedStatement, second.get(5, TimeUnit.SECONDS));
            assertFalse(secondPhysicalConnectionOpened);
            assertEquals(1, collect.openCount.get());
        } finally {
            collect.allowFirstOpen.countDown();
            GlobalConnectionCache.getInstance().removeCache(identifier);
        }
    }

    @Test
    void testConstructDatabaseUrlSecurityInterception() {
        JdbcCommonCollect jdbcCollect = new JdbcCommonCollect();
        String[] maliciousUrls = {
                // URL length limit test
                "jdbc:mysql://localhost:3306/test?" + "a".repeat(2050) + "=value",
                // url format check
                "jdbca:mysql://localhost:3306/test?allowLoadLocalInfile=true",
                // backlist check
                "jdbc:mysql://localhost:3306/test?allowLoadLocalInfile=true",
                // universal detection of JDBC injection and deserialization attacks
                "jdbc:mysql://localhost:3306/test?jndi:ldap://duansg.com/exploit",
                // universal detection of bypass
                "jdbc:mysql://localhost:3306/test?param=create\\trigger",
                // database platform specific bypass detection
                "jdbc:mysql://localhost:3306/test?allow\\nload\\nlocal\\ninfile=true"

        };

        // Test malicious URLs - should throw exceptions
        for (String maliciousUrl : maliciousUrls) {
            JdbcProtocol jdbcProtocol = JdbcProtocol.builder()
                    .host("localhost")
                    .port("3306")
                    .platform("mysql")
                    .username("root")
                    .password("root")
                    .database("test")
                    .url(maliciousUrl)
                    .build();

            assertThrows(Exception.class, () -> {
                constructDatabaseUrl(jdbcCollect, jdbcProtocol, "localhost", "3306");
            }, "Malicious URL should be blocked: " + maliciousUrl);
        }
    }

    private String constructDatabaseUrl(JdbcCommonCollect jdbcCollect, JdbcProtocol jdbcProtocol,
                                        String host, String port) throws Exception {
        try {
            Method constructMethod = JdbcCommonCollect.class
                    .getDeclaredMethod("constructDatabaseUrl", JdbcProtocol.class, String.class, String.class);
            constructMethod.setAccessible(true);
            return (String) constructMethod.invoke(jdbcCollect, jdbcProtocol, host, port);
        } catch (InvocationTargetException e) {
            Throwable cause = e.getCause();
            if (cause instanceof Exception exception) {
                throw exception;
            }
            if (cause instanceof Error error) {
                throw error;
            }
            throw new RuntimeException(cause);
        }
    }

    private Statement getConnection(JdbcCommonCollect jdbcCollect, String username, String password, String url,
                                    Integer timeout, boolean reuseConnection) throws Exception {
        try {
            Method getConnectionMethod = JdbcCommonCollect.class
                    .getDeclaredMethod("getConnection", String.class, String.class, String.class,
                            Integer.class, boolean.class);
            getConnectionMethod.setAccessible(true);
            return (Statement) getConnectionMethod.invoke(jdbcCollect, username, password, url, timeout,
                    reuseConnection);
        } catch (InvocationTargetException e) {
            Throwable cause = e.getCause();
            if (cause instanceof Exception exception) {
                throw exception;
            }
            if (cause instanceof Error error) {
                throw error;
            }
            throw new RuntimeException(cause);
        }
    }

    private static final class BlockingJdbcCommonCollect extends JdbcCommonCollect {

        private final Connection firstConnection;
        private final Connection secondConnection;
        private final CountDownLatch firstOpenStarted = new CountDownLatch(1);
        private final CountDownLatch secondOpenStarted = new CountDownLatch(1);
        private final CountDownLatch allowFirstOpen = new CountDownLatch(1);
        private final AtomicInteger openCount = new AtomicInteger();

        private BlockingJdbcCommonCollect(Connection firstConnection, Connection secondConnection) {
            this.firstConnection = firstConnection;
            this.secondConnection = secondConnection;
        }

        @Override
        Connection openConnection(String url, String username, String password) throws SQLException {
            if (openCount.incrementAndGet() == 1) {
                firstOpenStarted.countDown();
                try {
                    if (!allowFirstOpen.await(5, TimeUnit.SECONDS)) {
                        throw new SQLException("Timed out waiting to open the first connection");
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new SQLException("Interrupted while opening the first connection", e);
                }
                return firstConnection;
            }
            secondOpenStarted.countDown();
            return secondConnection;
        }
    }

}
