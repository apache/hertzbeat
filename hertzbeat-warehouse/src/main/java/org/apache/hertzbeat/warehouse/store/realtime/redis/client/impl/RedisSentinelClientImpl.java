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

import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisFuture;
import io.lettuce.core.RedisURI;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.codec.RedisCodec;
import io.lettuce.core.sentinel.api.StatefulRedisSentinelConnection;
import java.net.InetSocketAddress;
import java.net.SocketAddress;
import java.time.Duration;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Objects;
import java.util.function.Consumer;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.constants.SignConstants;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.serialize.RedisMetricsDataCodec;
import org.apache.hertzbeat.warehouse.store.realtime.redis.RedisProperties;
import org.apache.hertzbeat.warehouse.store.realtime.redis.client.RedisClientOperation;

/**
 * Redis Client for sentinel mode
 */
public class RedisSentinelClientImpl implements RedisClientOperation<String, CollectRep.MetricsData> {
    private RedisClient sentinelRedisClient;
    private StatefulRedisSentinelConnection<String, String> sentinelConnection;
    private RedisClient masterRedisClient;
    private StatefulRedisConnection<String, CollectRep.MetricsData> masterConnection;

    @Override
    public RedisClientOperation<String, CollectRep.MetricsData> connect(RedisProperties redisProperties,
                                                                        RedisCodec<String, CollectRep.MetricsData> redisCodec) {
        final String[] address = redisProperties.address().split(SignConstants.DOUBLE_MARK);

        RedisURI.Builder uriBuilder = RedisURI.builder()
                .withHost(address[0])
                .withPort(Integer.parseInt(address[1]))
                .withTimeout(Duration.of(10, ChronoUnit.SECONDS));
        if (StringUtils.isNotBlank(redisProperties.password())) {
            uriBuilder.withPassword(redisProperties.password().toCharArray());
        }

        sentinelRedisClient = RedisClient.create(uriBuilder.build());
        sentinelConnection = sentinelRedisClient.connectSentinel();
        final SocketAddress masterSocketAddress = sentinelConnection.sync().getMasterAddrByName(redisProperties.masterName());
        if (masterSocketAddress instanceof InetSocketAddress masterAddress) {
            RedisURI.Builder masterUriBuilder = RedisURI.builder()
                    .withHost(masterAddress.getHostName())
                    .withPort(masterAddress.getPort())
                    .withTimeout(Duration.of(10, ChronoUnit.SECONDS))
                    .withDatabase(redisProperties.db());
            if (StringUtils.isNotBlank(redisProperties.password())) {
                masterUriBuilder.withPassword(redisProperties.password().toCharArray());
            }

            masterRedisClient = RedisClient.create(masterUriBuilder.build());
            masterConnection = masterRedisClient.connect(new RedisMetricsDataCodec());
        } else {
            throw new UnsupportedOperationException("Incorrect type of SocketAddress, connect redis sentinel failed...");
        }

        return this;
    }

    @Override
    public CollectRep.MetricsData hget(String key, String field) {
        return masterConnection.sync().hget(key, field);
    }

    @Override
    public Map<String, CollectRep.MetricsData> hgetAll(String key) {
        return masterConnection.sync().hgetall(key);
    }

    @Override
    public void hset(String key, String field, CollectRep.MetricsData value, Consumer<RedisFuture<Boolean>> redisFutureConsumer) {
        final RedisFuture<Boolean> redisFuture = masterConnection.async().hset(key, field, value);
        if (Objects.nonNull(redisFutureConsumer)) {
            redisFutureConsumer.accept(redisFuture);
        }
    }

    @Override
    public void close() throws Exception {
        if (Objects.nonNull(masterConnection)) {
            masterConnection.close();
        }
        if (Objects.nonNull(masterRedisClient)) {
            masterRedisClient.close();
        }
        if (Objects.nonNull(sentinelConnection)) {
            sentinelConnection.close();
        }
        if (Objects.nonNull(sentinelRedisClient)) {
            sentinelRedisClient.close();
        }
    }
}
