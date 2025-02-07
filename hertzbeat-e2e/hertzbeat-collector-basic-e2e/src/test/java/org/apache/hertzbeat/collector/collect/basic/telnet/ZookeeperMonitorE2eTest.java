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

package org.apache.hertzbeat.collector.collect.basic.telnet;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.AbstractCollectE2eTest;
import org.apache.hertzbeat.collector.collect.telnet.TelnetCollectImpl;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.Protocol;
import org.apache.hertzbeat.common.entity.job.protocol.TelnetProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;

import java.time.Duration;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

/**
 * Integration test for Zookeeper monitoring functionality
 */
@Slf4j
@ExtendWith(MockitoExtension.class)
public class ZookeeperMonitorE2eTest extends AbstractCollectE2eTest {

    private static final String ZOOKEEPER_IMAGE_NAME = "zookeeper:3.8.4";
    private static final String ZOOKEEPER_NAME = "zookeeper";
    private static final Integer ZOOKEEPER_PORT = 2181;
    private static GenericContainer<?> zookeeperContainer;

    @AfterAll
    public static void tearDown() {
        if (zookeeperContainer != null) {
            zookeeperContainer.stop();
        }
    }

    @BeforeEach
    public void setUp() throws Exception {
        super.setUp();
        collect = new TelnetCollectImpl();
        metrics = new Metrics();

        try {
            // Start Zookeeper container with custom configuration
            zookeeperContainer = new GenericContainer<>(DockerImageName.parse(ZOOKEEPER_IMAGE_NAME))
                    .withExposedPorts(ZOOKEEPER_PORT)
                    .withEnv("ZOO_4LW_COMMANDS_WHITELIST", "*")
                    .withNetworkAliases(ZOOKEEPER_NAME)
                    .waitingFor(
                            Wait.forLogMessage(".*Started AdminServer on address.*\\n", 1)
                                    .withStartupTimeout(Duration.ofSeconds(60))
                    )
                    .withLogConsumer(outputFrame -> {
                        log.info(outputFrame.getUtf8String());
                    });

            zookeeperContainer.start();
            log.info("Zookeeper container started at {}:{}",
                    zookeeperContainer.getHost(),
                    zookeeperContainer.getMappedPort(ZOOKEEPER_PORT));
        } catch (Exception e) {
            e.printStackTrace();
            log.error("Failed to start Zookeeper container", e);
            throw e;
        }
        Thread.sleep(30000);
    }

    @Override
    protected CollectRep.MetricsData.Builder collectMetrics(Metrics metricsDef) {
        TelnetProtocol telnetProtocol = (TelnetProtocol) buildProtocol(metricsDef);
        metrics.setTelnet(telnetProtocol);
        CollectRep.MetricsData.Builder metricsData = CollectRep.MetricsData.newBuilder();
        metricsData.setApp(ZOOKEEPER_NAME);
        metrics.setAliasFields(metricsDef.getAliasFields());
        return collectMetricsData(metrics, metricsDef, metricsData);
    }

    @Override
    protected Protocol buildProtocol(Metrics metricsDef) {
        TelnetProtocol protocol = new TelnetProtocol();
        protocol.setHost(zookeeperContainer.getHost());
        protocol.setPort(String.valueOf(zookeeperContainer.getMappedPort(ZOOKEEPER_PORT)));
        protocol.setCmd(metricsDef.getTelnet().getCmd());
        return protocol;
    }

    @Test
    public void testZookeeperMonitor() {
        Assertions.assertTrue(zookeeperContainer.isRunning(), "Zookeeper container should be running");

        Job dockerJob = appService.getAppDefine("zookeeper");
        List<Map<String, Configmap>> configmapFromPreCollectData = new LinkedList<>();
        for (Metrics metricsDef : dockerJob.getMetrics()) {
            metricsDef = CollectUtil.replaceCryPlaceholderToMetrics(metricsDef, configmapFromPreCollectData.size() > 0 ? configmapFromPreCollectData.get(0) : new HashMap<>());
            CollectRep.MetricsData metricsData = validateMetricsCollection(metricsDef, metricsDef.getName());
            configmapFromPreCollectData = CollectUtil.getConfigmapFromPreCollectData(metricsData);
        }
    }
}
