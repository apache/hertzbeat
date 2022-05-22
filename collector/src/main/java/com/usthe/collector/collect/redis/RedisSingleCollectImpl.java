package com.usthe.collector.collect.redis;

import com.usthe.collector.collect.AbstractCollect;
import com.usthe.collector.collect.common.cache.CacheIdentifier;
import com.usthe.collector.collect.common.cache.CommonCache;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.job.protocol.RedisProtocol;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import io.lettuce.core.api.StatefulRedisConnection;
import lombok.extern.slf4j.Slf4j;
import org.springframework.util.Assert;
import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

/**
 * Redis 单机指标收集器
 *
 * @author <a href="mailto:Musk.Chen@fanruan.com">Musk.Chen</a>
 * @version 1.0
 * Created by Musk.Chen on 2022/5/17
 */
@Slf4j
public class RedisSingleCollectImpl extends AbstractCollect {

    public static RedisSingleCollectImpl getInstance() {
        return RedisSingleCollectImpl.Singleton.INSTANCE;
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long appId, String app, Metrics metrics) {
        preCheck(metrics);
        RedisClient redisClient = buildClient(metrics.getRedis());

        StatefulRedisConnection<String, String> connection = redisClient.connect();

        String info = connection.sync().info();
        Map<String, String> valueMap = parseInfo(info);
        if (log.isDebugEnabled()) {
            log.debug("[RedisSingleCollectImpl] fetch redis info");
            valueMap.forEach((k, v) -> log.debug("{} : {}", k, v));
        }
        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
        metrics.getAliasFields().forEach(it -> {
            if (valueMap.containsKey(it)) {
                String fieldValue = valueMap.get(it);
                if (fieldValue == null) {
                    valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
                } else {
                    valueRowBuilder.addColumns(fieldValue);
                }
            } else {
                valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
            }
        });
        builder.addValues(valueRowBuilder.build());

        connection.closeAsync();
    }

    /**
     * pre check params
     */
    private void preCheck(Metrics metrics) {
        if (metrics == null || metrics.getRedis() == null) {
            throw new IllegalArgumentException("Redis collect must has redis params");
        }
        RedisProtocol redisProtocol = metrics.getRedis();
        Assert.hasText(redisProtocol.getHost(), "Redis Protocol host is required.");
        Assert.hasText(redisProtocol.getPort(), "Redis Protocol port is required.");
    }

    /**
     * build single redis client
     *
     * @param redisProtocol redis protocol config
     * @return redis single client
     */
    private RedisClient buildClient(RedisProtocol redisProtocol) {
        RedisURI redisUri = RedisURI.create(redisProtocol.getHost(), Integer.parseInt(redisProtocol.getPort()));
        if (StringUtils.hasText(redisProtocol.getUsername())) {
            redisUri.setUsername(redisProtocol.getUsername());
        }
        if (StringUtils.hasText(redisProtocol.getPassword())) {
            redisUri.setPassword(redisProtocol.getPassword().toCharArray());
        }
        CacheIdentifier identifier = CacheIdentifier.builder()
                .ip(redisProtocol.getHost())
                .port(redisProtocol.getPort())
                .username(redisProtocol.getUsername())
                .password(redisProtocol.getPassword())
                .build();
        CommonCache commonCache = CommonCache.getInstance();
        return commonCache.getCache(identifier, true)
                .map(r -> (RedisClient) r)
                .orElseGet(() -> {
                    // create new redis client
                    RedisClient redisClient = RedisClient.create(redisUri);
                    commonCache.addCache(identifier, redisClient);
                    return redisClient;
                });
    }

    /**
     * parse redis info
     *
     * @param info redis info
     * @return parsed redis info
     */
    private Map<String, String> parseInfo(String info) {
        String[] lines = info.split("\n");
        Map<String, String> result = new HashMap<>(16);
        Arrays.stream(lines)
                .filter(it -> StringUtils.hasText(it) && !it.startsWith("#") && it.contains(":"))
                .map(this::removeCr)
                .map(r -> r.split(":"))
                .forEach(it -> {
                    if (it.length > 1) {
                        result.put(it[0], it[1]);
                    }
                });
        return result;
    }

    private String removeCr(String value) {
        return value.replace("\r", "");
    }

    private static class Singleton {
        private static final RedisSingleCollectImpl INSTANCE = new RedisSingleCollectImpl();
    }
}
