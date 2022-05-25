package com.usthe.collector.collect.redis;

import com.usthe.collector.collect.AbstractCollect;
import com.usthe.collector.collect.common.cache.CacheIdentifier;
import com.usthe.collector.collect.common.cache.CommonCache;
import com.usthe.collector.collect.common.cache.RedisConnect;
import com.usthe.collector.util.CollectUtil;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.job.protocol.RedisProtocol;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisConnectionException;
import io.lettuce.core.RedisURI;
import io.lettuce.core.api.StatefulRedisConnection;
import lombok.extern.slf4j.Slf4j;
import org.springframework.util.Assert;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

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
        try {
            preCheck(metrics);
        } catch (Exception e) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(e.getMessage());
            return;
        }
        try {
            StatefulRedisConnection<String, String> connection = getConnection(metrics.getRedis());
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
        } catch (RedisConnectionException connectionException) {
            log.info("[redis connection] error: {}", connectionException.getMessage());
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg(connectionException.getMessage());
        } catch (Exception e) {
            // todo 根据不同的异常判断是连接失败还是采集失败
            log.warn("[redis collect] error: {}", e.getMessage(), e);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(e.getMessage());
        }
    }

    /**
     * preCheck params
     */
    private void preCheck(Metrics metrics) {
        if (metrics == null || metrics.getRedis() == null) {
            throw new IllegalArgumentException("Redis collect must has redis params");
        }
        RedisProtocol redisProtocol = metrics.getRedis();
        Assert.hasText(redisProtocol.getHost(), "Redis Protocol host is required.");
        Assert.hasText(redisProtocol.getPort(), "Redis Protocol port is required.");
    }

    private StatefulRedisConnection<String, String> getConnection(RedisProtocol redisProtocol) {
        CacheIdentifier identifier = CacheIdentifier.builder()
                .ip(redisProtocol.getHost())
                .port(redisProtocol.getPort())
                .username(redisProtocol.getUsername())
                .password(redisProtocol.getPassword())
                .build();
        StatefulRedisConnection<String, String> connection = null;
        Optional<Object> cacheOption = CommonCache.getInstance().getCache(identifier, true);
        if (cacheOption.isPresent()) {
            RedisConnect redisConnect = (RedisConnect) cacheOption.get();
            connection = redisConnect.getConnection();
            if (!connection.isOpen()) {
                try {
                    connection.closeAsync();
                } catch (Exception e) {
                    log.info("The redis connect form cache, close error: {}", e.getMessage());
                }
                connection = null;
                CommonCache.getInstance().removeCache(identifier);
            }
        }
        if (connection != null) {
            return connection;
        }
        // reuse connection failed, new one
        RedisClient redisClient = buildClient(redisProtocol);
        connection = redisClient.connect();
        CommonCache.getInstance().addCache(identifier, new RedisConnect(connection));
        return connection;
    }

    /**
     * build single redis client
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
        Duration timeout = Duration.ofMillis(CollectUtil.getTimeout(redisProtocol.getTimeout()));
        redisUri.setTimeout(timeout);
        return RedisClient.create(redisUri);
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
