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

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.JdbcProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

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

        String[] platforms = new String[]{
            "mysql", "mariadb",
            "postgresql",
            "clickhouse",
            "sqlserver",
            "oracle",
            "dm"
        };
        for (String platform : platforms) {
            JdbcProtocol jdbc = new JdbcProtocol();
            jdbc.setPlatform(platform);

            Metrics metrics = new Metrics();
            metrics.setJdbc(jdbc);

            CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
            jdbcCommonCollect.collect(builder, metrics);
            assertNotEquals(builder.getMsg(), "Query Error: Not support database platform: " + platform);
        }
        // invalid platform
        JdbcProtocol jdbc = new JdbcProtocol();
        jdbc.setPlatform("invalid");

        Metrics metrics = new Metrics();
        metrics.setJdbc(jdbc);

        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        jdbcCommonCollect.collect(builder, metrics);
        assertEquals(builder.getCode(), CollectRep.Code.FAIL);
        assertEquals(builder.getMsg(), "Query Error: Not support database platform: invalid");
    }

    @Test
    void supportProtocol() {
        String protocol = jdbcCommonCollect.supportProtocol();
        assertEquals(DispatchConstants.PROTOCOL_JDBC, protocol);
    }
}
