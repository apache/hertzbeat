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
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.common.util.ProtoJsonUtil;
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
    private final StatefulRedisConnection<String, String> connection;
    private final RedisCommands<String, String> syncCommands;
    private final String metricsDataQueueNameToAlerter;
    private final String metricsDataQueueNameToPersistentStorage;
    private final String metricsDataQueueNameToRealTimeStorage;
    private final String alertsDataQueueName;
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
        this.connection = redisClient.connect();
        this.syncCommands = connection.sync();
        this.metricsDataQueueNameToAlerter = redisProperties.getMetricsDataQueueNameToAlerter();
        this.metricsDataQueueNameToPersistentStorage = redisProperties.getMetricsDataQueueNameToPersistentStorage();
        this.metricsDataQueueNameToRealTimeStorage = redisProperties.getMetricsDataQueueNameToRealTimeStorage();
        this.alertsDataQueueName = redisProperties.getAlertsDataQueueName();
    }

    @Override
    public Alert pollAlertsData() {

        try {
            String alertJson = syncCommands.rpop(alertsDataQueueName);
            if (alertJson != null) {
                return JsonUtil.fromJson(alertJson, Alert.class);
            }
        } catch (Exception e) {
            log.error("please config common.queue.redis props correctly", e);
            throw new RuntimeException(e);
        }
        return null;
    }

    @Override
    public CollectRep.MetricsData pollMetricsDataToAlerter() {

        try {
            String metricsDataJson = syncCommands.rpop(metricsDataQueueNameToAlerter);
            if (metricsDataJson != null) {
                return (CollectRep.MetricsData) ProtoJsonUtil.toProtobuf(metricsDataJson, CollectRep.MetricsData.newBuilder());
            }
        } catch (Exception e) {
            log.error(e.getMessage());
            throw new RuntimeException(e);
        }
        return null;
    }

    @Override
    public CollectRep.MetricsData pollMetricsDataToPersistentStorage() throws InterruptedException {

        try {
            String metricsDataJson = syncCommands.rpop(metricsDataQueueNameToPersistentStorage);
            if (metricsDataJson != null) {
                return JsonUtil.fromJson(metricsDataJson, CollectRep.MetricsData.class);
            }
        } catch (Exception e) {
            log.error(e.getMessage());
            throw new RuntimeException(e);
        }
        return null;
    }

    @Override
    public CollectRep.MetricsData pollMetricsDataToRealTimeStorage() throws InterruptedException {

        try {
            String metricsDataJson = syncCommands.rpop(metricsDataQueueNameToRealTimeStorage);
            if (metricsDataJson != null) {
                return JsonUtil.fromJson(metricsDataJson, CollectRep.MetricsData.class);
            }
        } catch (Exception e) {
            log.error(e.getMessage());
            throw new RuntimeException(e);
        }
        return null;
    }

    @Override
    public void sendAlertsData(Alert alert) {

        try {
            String alertJson = JsonUtil.toJson(alert);
            syncCommands.lpush(alertsDataQueueName, alertJson);
        } catch (Exception e) {
            log.error(e.getMessage());
            throw new RuntimeException(e);
        }
    }

    @Override
    public void sendMetricsData(CollectRep.MetricsData metricsData) {

        try {
            String metricsDataJson = ProtoJsonUtil.toJsonStr(metricsData);
            syncCommands.lpush(metricsDataQueueNameToAlerter, metricsDataJson);
            syncCommands.lpush(metricsDataQueueNameToPersistentStorage, metricsDataJson);
            syncCommands.lpush(metricsDataQueueNameToRealTimeStorage, metricsDataJson);
        } catch (Exception e) {
            log.error(e.getMessage());
            throw new RuntimeException(e);
        }
    }

    @Override
    public void destroy() {

        connection.close();
        redisClient.shutdown();
    }

}
