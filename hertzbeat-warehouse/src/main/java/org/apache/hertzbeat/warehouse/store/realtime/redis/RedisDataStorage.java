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

package org.apache.hertzbeat.warehouse.store.realtime.redis;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.warehouse.store.realtime.AbstractRealTimeDataStorage;
import org.apache.hertzbeat.warehouse.store.realtime.redis.client.RedisCommandDelegate;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

/**
 * redis storage collects real-time data
 */
@Primary
@Component
@ConditionalOnProperty(prefix = "warehouse.real-time.redis", name = "enabled", havingValue = "true")
@Slf4j
public class RedisDataStorage extends AbstractRealTimeDataStorage {

    private final RedisCommandDelegate redisCommandDelegate;

    public RedisDataStorage(RedisProperties redisProperties) {
        final RedisCommandDelegate delegate = RedisCommandDelegate.getInstance();
        this.serverAvailable = delegate.initRedisClient(redisProperties);
        this.redisCommandDelegate = delegate;
    }

    @Override
    public CollectRep.MetricsData getCurrentMetricsData(@NonNull Long monitorId, @NonNull String metric) {
        return redisCommandDelegate.operate().hget(String.valueOf(monitorId), metric);
    }

    @Override
    public List<CollectRep.MetricsData> getCurrentMetricsData(@NonNull Long monitorId) {
        Map<String, CollectRep.MetricsData> metricsDataMap = redisCommandDelegate.operate().hgetAll(String.valueOf(monitorId));
        return new ArrayList<>(metricsDataMap.values());
    }

    @Override
    public void saveData(CollectRep.MetricsData metricsData) {
        String key = String.valueOf(metricsData.getId());
        String hashKey = metricsData.getMetrics();
        if (metricsData.getCode() != CollectRep.Code.SUCCESS || !isServerAvailable()) {
            return;
        }

        redisCommandDelegate.operate().hset(key, hashKey, metricsData, future -> future.thenAccept(response -> {
            if (response) {
                log.debug("[warehouse] redis add new data {}:{}.", key, hashKey);
            } else {
                log.debug("[warehouse] redis replace data {}:{}.", key, hashKey);
            }
        }));
    }

    @Override
    public void destroy() throws Exception {
        redisCommandDelegate.destroy();
    }
}
