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

package com.usthe.warehouse.store;

import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.queue.CommonDataQueue;
import com.usthe.warehouse.WarehouseWorkerPool;
import com.usthe.warehouse.config.WarehouseProperties;
import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.api.async.RedisAsyncCommands;
import io.lettuce.core.api.sync.RedisCommands;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.temporal.ChronoUnit;

/**
 * redis存储采集实时数据
 * @author tom
 * @date 2021/11/25 10:26
 */
@Component
@ConditionalOnProperty(prefix = "warehouse.store.redis",
        name = "enabled", havingValue = "true")
@Slf4j
public class RealTimeRedisDataStorage extends AbstractRealTimeDataStorage {

    private RedisClient redisClient;
    private StatefulRedisConnection<String, CollectRep.MetricsData> connection;

    public RealTimeRedisDataStorage(WarehouseProperties properties, WarehouseWorkerPool workerPool,
                                    CommonDataQueue commonDataQueue) {
        super(workerPool, commonDataQueue);
        initRedisClient(properties);
        startStorageData("warehouse-redis-data-storage");
    }

    @Override
    public CollectRep.MetricsData getCurrentMetricsData(@NonNull Long monitorId, @NonNull String metric) {
        RedisCommands<String, CollectRep.MetricsData> commands = connection.sync();
        return commands.hget(String.valueOf(monitorId), metric);
    }

    @Override
    public void saveData(CollectRep.MetricsData metricsData) {
        String key = String.valueOf(metricsData.getId());
        String hashKey = metricsData.getMetrics();
        if (metricsData.getCode() != CollectRep.Code.SUCCESS) {
            return;
        }
        if (metricsData.getValuesList().isEmpty()) {
            log.info("[warehouse redis] redis flush metrics data {} - {} is null, ignore.", key, hashKey);
            return;
        }
        RedisAsyncCommands<String, CollectRep.MetricsData> commands = connection.async();
        commands.hset(key, hashKey, metricsData).thenAccept(response -> {
            if (response) {
                log.debug("[warehouse] redis add new data {}:{}.", key, hashKey);
            } else {
                log.debug("[warehouse] redis replace data {}:{}.", key, hashKey);
            }
        });
    }

    private void initRedisClient(WarehouseProperties properties) {
        if (properties == null || properties.getStore() == null || properties.getStore().getRedis() == null) {
            log.error("init error, please config Warehouse redis props in application.yml");
            throw new IllegalArgumentException("please config Warehouse redis props");
        }
        WarehouseProperties.StoreProperties.RedisProperties redisProp = properties.getStore().getRedis();
        RedisURI.Builder uriBuilder = RedisURI.builder()
                .withHost(redisProp.getHost())
                .withPort(redisProp.getPort())
                .withTimeout(Duration.of(10, ChronoUnit.SECONDS));
        if (redisProp.getPassword() != null && !"".equals(redisProp.getPassword())) {
            uriBuilder.withPassword(redisProp.getPassword().toCharArray());
        }
        redisClient = RedisClient.create(uriBuilder.build());
        connection = redisClient.connect(new MetricsDataRedisCodec());
    }

    @Override
    public void destroy() {
        if (connection != null) {
            connection.close();
        }
        if (redisClient != null) {
            redisClient.shutdown();
        }
    }
}
