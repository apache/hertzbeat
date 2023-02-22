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

package com.usthe.collector.collect.redis;

import com.usthe.collector.collect.common.cache.CacheIdentifier;
import com.usthe.collector.collect.common.cache.CommonCache;
import com.usthe.collector.collect.common.cache.RedisConnect;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.job.protocol.RedisProtocol;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import io.lettuce.core.RedisClient;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.resource.ClientResources;
import io.lettuce.core.resource.DefaultClientResources;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;
import java.util.Objects;

/**
 * Redis 单机指标收集器
 *
 *
 * @version 1.0
 * Created by Musk.Chen on 2022/5/17
 */
@Slf4j
public class RedisSingleCollectImpl extends RedisCommonCollectImpl {

    private final ClientResources defaultClientResources;

    public RedisSingleCollectImpl() {
        defaultClientResources = DefaultClientResources.create();
    }

    /**
     *
     * @param metrics
     * @return
     */
    public Map<String, String> getRedisInfo(Metrics metrics) {
        StatefulRedisConnection<String, String> connection = getConnection(metrics.getRedis());
        String info = connection.sync().info(metrics.getName());
        Map<String, String> valueMap = parseInfo(info);
        if (log.isDebugEnabled()) {
            log.debug("[RedisSingleCollectImpl] fetch redis info");
            valueMap.forEach((k, v) -> log.debug("{} : {}", k, v));
        }
        return valueMap;
    }


    private StatefulRedisConnection<String, String> getConnection(RedisProtocol redisProtocol) {
        CacheIdentifier identifier = doIdentifier(redisProtocol);
        StatefulRedisConnection<String, String> connection = (StatefulRedisConnection<String, String>) getStatefulConnection(identifier);
        if (Objects.isNull(connection)) {
            // reuse connection failed, new one
            RedisClient redisClient = buildClient(redisProtocol);
            connection = redisClient.connect();
            CommonCache.getInstance().addCache(identifier, new RedisConnect(connection));
        }
        return connection;
    }

    /**
     * build single redis client
     *
     * @param redisProtocol redis protocol config
     * @return redis single client
     */
    private RedisClient buildClient(RedisProtocol redisProtocol) {
        return RedisClient.create(defaultClientResources, redisUri(redisProtocol));
    }


}
