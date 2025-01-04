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

package org.apache.hertzbeat.common.queue.impl;

import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.api.sync.RedisCommands;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.config.CommonProperties;
import org.apache.hertzbeat.common.constants.DataQueueConstants;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.common.serialize.RedisMetricsDataCodec;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

/**
 * common data queue implement redis.
 */
@Slf4j
@Configuration
@ConditionalOnProperty(
        prefix = DataQueueConstants.PREFIX,
        name = DataQueueConstants.NAME,
        havingValue = DataQueueConstants.REDIS
)
public class RedisCommonDataQueue implements CommonDataQueue, DisposableBean {

    private final RedisClient redisClient;
    private final StatefulRedisConnection<String, CollectRep.MetricsData> connection;
    private final RedisCommands<String, CollectRep.MetricsData> syncCommands;
    private final String metricsDataQueueNameToStorage;
    private final String metricsDataQueueNameForServiceDiscovery;
    private final String metricsDataQueueNameToAlerter;
    private final CommonProperties.RedisProperties redisProperties;

    public RedisCommonDataQueue(CommonProperties properties) {

        if (properties == null || properties.getQueue() == null || properties.getQueue().getRedis() == null) {
            log.error("init error, please config common.queue.redis props in application.yml");
            throw new IllegalArgumentException("please config common.queue.redis props");
        }

        this.redisProperties = properties.getQueue().getRedis();

        this.redisClient = RedisClient.create(
                RedisURI.builder()
                        .withHost(redisProperties.getRedisHost())
                        .withPort(redisProperties.getRedisPort())
                        .build()
        );
        RedisMetricsDataCodec codec = new RedisMetricsDataCodec();
        this.connection = redisClient.connect(codec);
        this.syncCommands = connection.sync();
        this.metricsDataQueueNameToStorage = redisProperties.getMetricsDataQueueNameToPersistentStorage();
        this.metricsDataQueueNameForServiceDiscovery = redisProperties.getMetricsDataQueueNameForServiceDiscovery();
        this.metricsDataQueueNameToAlerter = redisProperties.getMetricsDataQueueNameToAlerter();
    }

    @Override
    public CollectRep.MetricsData pollMetricsDataToAlerter() {
        try {
            return syncCommands.rpop(metricsDataQueueNameToAlerter);
        } catch (Exception e) {
            log.error(e.getMessage());
            return null;
        }
    }

    @Override
    public CollectRep.MetricsData pollMetricsDataToStorage() throws InterruptedException {
        try {
            return syncCommands.rpop(metricsDataQueueNameToStorage);
        } catch (Exception e) {
            log.error(e.getMessage());
            return null;
        }
    }

    @Override
    public CollectRep.MetricsData pollServiceDiscoveryData() throws InterruptedException {
        try {
            return syncCommands.rpop(metricsDataQueueNameForServiceDiscovery);
        } catch (Exception e) {
            log.error(e.getMessage());
            return null;
        }
    }

    @Override
    public void sendMetricsData(CollectRep.MetricsData metricsData) {
        try {
            syncCommands.lpush(metricsDataQueueNameToAlerter, metricsData);
        } catch (Exception e) {
            log.error(e.getMessage());
        }
    }

    @Override
    public void sendMetricsDataToStorage(CollectRep.MetricsData metricsData) {
        try {
            syncCommands.lpush(metricsDataQueueNameToStorage, metricsData);
        } catch (Exception e) {
            log.error(e.getMessage());
        }
    }

    @Override
    public void sendServiceDiscoveryData(CollectRep.MetricsData metricsData) {
        try {
            syncCommands.lpush(metricsDataQueueNameForServiceDiscovery, metricsData);
        } catch (Exception e) {
            log.error(e.getMessage());
        }
    }

    @Override
    public void destroy() {
        connection.close();
        redisClient.shutdown();
    }

}
