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

package org.apache.hertzbeat.warehouse.store.realtime.redis.client.impl;

import io.lettuce.core.RedisFuture;
import io.lettuce.core.RedisURI;
import io.lettuce.core.cluster.RedisClusterClient;
import io.lettuce.core.cluster.api.StatefulRedisClusterConnection;
import io.lettuce.core.codec.RedisCodec;
import java.time.Duration;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Consumer;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.constants.SignConstants;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.warehouse.store.realtime.redis.RedisProperties;
import org.apache.hertzbeat.warehouse.store.realtime.redis.client.RedisClientOperation;

/**
 * Redis Client for cluster mode
 */
public class RedisClusterClientImpl implements RedisClientOperation<String, CollectRep.MetricsData> {
    private RedisClusterClient redisClusterClient;
    private StatefulRedisClusterConnection<String, CollectRep.MetricsData> connection;

    @Override
    public RedisClientOperation<String, CollectRep.MetricsData> connect(RedisProperties redisProperties,
                                                                        RedisCodec<String, CollectRep.MetricsData> redisCodec) {
        final String[] clusterAddress = redisProperties.address().split(SignConstants.COMMA);
        Set<RedisURI> clusterUri = new HashSet<>();
        for (String address : clusterAddress) {
            final String[] split = address.split(SignConstants.DOUBLE_MARK);
            RedisURI.Builder uriBuilder = RedisURI.builder()
                    .withHost(split[0])
                    .withPort(Integer.parseInt(split[1]))
                    .withTimeout(Duration.of(10, ChronoUnit.SECONDS));
            if (StringUtils.isNotBlank(redisProperties.password())) {
                uriBuilder.withPassword(redisProperties.password().toCharArray());
            }

            clusterUri.add(uriBuilder.build());
        }

        redisClusterClient = RedisClusterClient.create(clusterUri);
        connection = redisClusterClient.connect(redisCodec);
        return this;
    }

    @Override
    public CollectRep.MetricsData hget(String key, String field) {
        return connection.sync().hget(key, field);
    }

    @Override
    public Map<String, CollectRep.MetricsData> hgetAll(String key) {
        return connection.sync().hgetall(key);
    }

    @Override
    public void hset(String key, String field, CollectRep.MetricsData value, Consumer<RedisFuture<Boolean>> redisFutureConsumer) {
        final RedisFuture<Boolean> redisFuture = connection.async().hset(key, field, value);
        if (Objects.nonNull(redisFutureConsumer)) {
            redisFutureConsumer.accept(redisFuture);
        }
    }

    @Override
    public void close() throws Exception {
        if (Objects.nonNull(connection)) {
            connection.close();
        }
        if (Objects.nonNull(redisClusterClient)) {
            redisClusterClient.close();
        }
    }
}
