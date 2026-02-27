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

package org.apache.hertzbeat.collector.collect.basic.redis;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.AbstractCollectE2eTest;
import org.apache.hertzbeat.collector.collect.redis.RedisCommonCollectImpl;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.Protocol;
import org.apache.hertzbeat.common.entity.job.protocol.RedisProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.Network;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.lifecycle.Startables;
import org.testcontainers.utility.DockerImageName;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeoutException;
import java.util.stream.Stream;

/**
 * End-to-end test class for redis collector
 */
@Slf4j
@ExtendWith(MockitoExtension.class)
public class RedisCommonCollectE2eTest extends AbstractCollectE2eTest {
    private static final String REDIS_IMAGE = "redis:7.4.2";
    private static final String HOST = "127.0.0.1";
    private static final int REDIS_PORT = 6379;
    private static final String REDIS_PATTERN = "1";
    private static final List<String> ALLOW_EMPTY_WHITE_LIST = Arrays.asList("server", "errorstats", "commandstats", "keyspace");

    private static GenericContainer<?> redisContainer;

    private Integer mappedPort;

    @AfterAll
    public static void tearDown() throws InterruptedException {
        if (redisContainer != null) {
            redisContainer.stop();
        }
    }

    @BeforeEach
    public void setUp() throws Exception {
        super.setUp();
        collect = new RedisCommonCollectImpl();

        // Set up and start container
        setupAndStartContainer();

        mappedPort = redisContainer.getMappedPort(REDIS_PORT);
        log.info("Container started successfully with mapped port: {}", mappedPort);
    }

    @Test
    public void testRedisCollect() throws ExecutionException, InterruptedException, TimeoutException {
        Assertions.assertTrue(redisContainer.isRunning(), "redis container should be running");

        Job redisJob = appService.getAppDefine("redis");
        redisJob.getMetrics().forEach(metricsDef -> {
            if (ALLOW_EMPTY_WHITE_LIST.contains(metricsDef.getName())) {
                validateMetricsCollection(metricsDef, metricsDef.getName(), true);
            } else {
                validateMetricsCollection(metricsDef, metricsDef.getName());
            }
        });
    }

    @Override
    protected CollectRep.MetricsData.Builder collectMetrics(Metrics metricsDef) {
        //Build redis protocol configuration
        RedisProtocol redisProtocol = (RedisProtocol) buildProtocol(metricsDef);
        metrics.setRedis(redisProtocol);
        metrics.setName(metricsDef.getName());
        metrics.setFields(metricsDef.getFields());
        return collectMetricsData(metrics, metricsDef);
    }

    @Override
    protected Protocol buildProtocol(Metrics metricsDef) {
        RedisProtocol redisProtocol = new RedisProtocol();
        redisProtocol.setHost(HOST);
        redisProtocol.setPort(mappedPort.toString());
        redisProtocol.setPattern(REDIS_PATTERN);
        return redisProtocol;
    }

    public void setupAndStartContainer() {
        Network network = Network.builder().build();
        redisContainer = new GenericContainer<>(DockerImageName.parse(REDIS_IMAGE))
                .withExposedPorts(REDIS_PORT)
                .withNetwork(network)
                .withNetworkAliases("redis")
                .waitingFor(Wait.forListeningPort())
                .withStartupTimeout(Duration.ofSeconds(30));

        Startables.deepStart(Stream.of(redisContainer)).join();
    }
}
