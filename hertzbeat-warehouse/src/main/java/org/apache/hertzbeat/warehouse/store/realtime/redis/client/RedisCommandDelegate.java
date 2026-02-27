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

package org.apache.hertzbeat.warehouse.store.realtime.redis.client;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.serialize.RedisMetricsDataCodec;
import org.apache.hertzbeat.warehouse.store.realtime.redis.RedisProperties;
import org.apache.hertzbeat.warehouse.store.realtime.redis.client.impl.RedisClusterClientImpl;
import org.apache.hertzbeat.warehouse.store.realtime.redis.client.impl.RedisSentinelClientImpl;
import org.apache.hertzbeat.warehouse.store.realtime.redis.client.impl.RedisSimpleClientImpl;

/**
 * Redis command delegate
 */
@Slf4j
public class RedisCommandDelegate {
    private static final String SINGLE_MODE = "single";
    private static final String SENTINEL_MODE = "sentinel";
    private static final String CLUSTER_MODE = "cluster";
    private static final RedisCommandDelegate INSTANCE = new RedisCommandDelegate();
    private RedisClientOperation<String, CollectRep.MetricsData> operation;

    public static RedisCommandDelegate getInstance() {
        return INSTANCE;
    }

    public RedisClientOperation<String, CollectRep.MetricsData> operate() {
        return operation;
    }

    public void destroy() throws Exception {
        operation.close();
    }

    public boolean initRedisClient(RedisProperties redisProperties) {
        if (redisProperties == null) {
            log.error("init error, please config Warehouse redis props in application.yml");
            return false;
        }

        try {
            operation = switch (redisProperties.mode()) {
                case SINGLE_MODE -> new RedisSimpleClientImpl().connect(redisProperties, new RedisMetricsDataCodec());
                case SENTINEL_MODE -> new RedisSentinelClientImpl().connect(redisProperties, new RedisMetricsDataCodec());
                case CLUSTER_MODE -> new RedisClusterClientImpl().connect(redisProperties, new RedisMetricsDataCodec());
                default -> throw new UnsupportedOperationException("Incorrect redis mode: " + redisProperties.mode());
            };

            return true;
        } catch (Exception e) {
            log.error("init redis error {}", e.getMessage(), e);
        }

        return false;
    }

    private RedisCommandDelegate() {
    }
}
