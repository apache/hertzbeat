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

package org.apache.hertzbeat.manager.script;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import java.io.InputStream;
import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.Map;
import org.apache.hertzbeat.collector.collect.database.JdbcCommonCollect;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.JdbcProtocol;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Regression coverage for DM's ordinary form parameters and JDBC URL construction.
 */
class DmTemplateTest {

    @Test
    void ordinaryFormParametersConstructUrlsForEveryMetric() throws Exception {
        Job template;
        try (InputStream stream = getClass().getResourceAsStream("/define/app-dm.yml")) {
            assertNotNull(stream);
            template = new Yaml().loadAs(stream, Job.class);
        }
        Map<String, Configmap> parameters = new HashMap<>();
        Map.of("host", "127.0.0.1", "port", "5236", "username", "SYSDBA",
                "password", "LocalTestOnly123", "timeout", "3000")
                .forEach((key, value) -> parameters.put(key, Configmap.builder().key(key).value(value).build()));
        Gson gson = new Gson();
        Method constructUrl = JdbcCommonCollect.class.getDeclaredMethod(
                "constructDatabaseUrl", JdbcProtocol.class, String.class, String.class);
        constructUrl.setAccessible(true);
        JdbcCommonCollect collector = new JdbcCommonCollect();
        assertEquals(3, template.getMetrics().size());
        for (Metrics metric : template.getMetrics()) {
            JsonElement expanded = CollectUtil.replaceSmilingPlaceholder(gson.toJsonTree(metric), parameters);
            JdbcProtocol jdbc = gson.fromJson(expanded, Metrics.class).getJdbc();
            assertEquals("127.0.0.1", jdbc.getHost(), metric.getName());
            assertEquals("5236", jdbc.getPort(), metric.getName());
            assertEquals("SYSDBA", jdbc.getUsername(), metric.getName());
            assertEquals("LocalTestOnly123", jdbc.getPassword(), metric.getName());
            assertEquals("3000", jdbc.getTimeout(), metric.getName());
            assertNull(jdbc.getDatabase(), metric.getName());
            assertEquals("jdbc:dm://127.0.0.1:5236",
                    constructUrl.invoke(collector, jdbc, jdbc.getHost(), jdbc.getPort()), metric.getName());
        }
    }
}
