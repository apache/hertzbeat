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

package org.apache.hertzbeat.collector.collect.basic.database;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.AbstractCollectE2eTest;
import org.apache.hertzbeat.collector.collect.database.JdbcCommonCollect;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.JdbcProtocol;
import org.apache.hertzbeat.common.entity.job.protocol.Protocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

/**
 * E2e test monitored by Jdbc Common
 */
@Slf4j
@ExtendWith(MockitoExtension.class)
public class JdbcCommonCollectE2eTest extends AbstractCollectE2eTest {
    private static final DatabaseImagesEnum databaseImage = DatabaseImagesEnum.fromImageName("postgresql");

    private static final String DATABASE_IMAGE_NAME = databaseImage.getImageName();

    private static final String DATABASE_IMAGE_TAG = databaseImage.getDefaultTag();

    @BeforeEach
    public void setUp() throws Exception {
        super.setUp();
        collect = new JdbcCommonCollect();
        metrics = new Metrics();
    }

    @Override
    protected CollectRep.MetricsData.Builder collectMetrics(Metrics metricsDef) {
        JdbcProtocol jdbcProtocol = (JdbcProtocol) buildProtocol(metricsDef);
        metrics.setJdbc(jdbcProtocol);
        CollectRep.MetricsData.Builder metricsData = CollectRep.MetricsData.newBuilder();
        metricsData.setApp(DATABASE_IMAGE_NAME);
        metrics.setAliasFields(metricsDef.getAliasFields());
        return collectMetricsData(metrics, metricsDef, metricsData);
    }

    @Override
    protected Protocol buildProtocol(Metrics metricsDef) {
        JdbcProtocol jdbcProtocol = metricsDef.getJdbc();
        jdbcProtocol.setHost(DATABASE_IMAGE_NAME);
        jdbcProtocol.setPort(DATABASE_IMAGE_TAG);
        jdbcProtocol.setDatabase("test");
        jdbcProtocol.setPlatform("testcontainers");
        return jdbcProtocol;
    }

    @Test
    public void testWithJdbcTcUrl() {
        Job dockerJob = appService.getAppDefine(DATABASE_IMAGE_NAME);
        List<Map<String, Configmap>> configmapFromPreCollectData = new LinkedList<>();
        for (Metrics metricsDef : dockerJob.getMetrics()) {
            metricsDef = CollectUtil.replaceCryPlaceholderToMetrics(metricsDef, configmapFromPreCollectData.size() > 0 ? configmapFromPreCollectData.get(0) : new HashMap<>());
            String metricName = metricsDef.getName();
            if ("slow_sql".equals(metricName)) {
                Metrics finalMetricsDef = metricsDef;
                assertDoesNotThrow(() -> collectMetrics(finalMetricsDef),
                        String.format("%s failed to collect metrics)", metricName));
                log.info("{} metrics validation passed", metricName);
                continue;  // skip slow_sql, extra extensions
            }
            CollectRep.MetricsData metricsData = validateMetricsCollection(metricsDef, metricName, true);
            CollectUtil.getConfigmapFromPreCollectData(metricsData);
        }
    }
}
