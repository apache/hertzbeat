package com.usthe.collector.collect.redis;

import com.usthe.collector.collect.AbstractCollect;
import com.usthe.collector.collect.common.cache.CacheIdentifier;
import com.usthe.collector.collect.common.cache.CommonCache;
import com.usthe.collector.collect.common.cache.RedisConnect;
import com.usthe.collector.dispatch.DispatchConstants;
import com.usthe.collector.util.CollectUtil;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.job.protocol.RedisProtocol;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import com.usthe.common.util.CommonUtil;
import io.lettuce.core.RedisConnectionException;
import io.lettuce.core.RedisURI;
import io.lettuce.core.api.StatefulConnection;
import lombok.extern.slf4j.Slf4j;
import org.springframework.util.Assert;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.util.*;

/**
 * @description:
 *
 * @create: 2023/02/19
 */
@Slf4j
public class RedisCommonCollectImpl extends AbstractCollect {


    private static final String CLUSTER = "3";

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
            Map<String, String> redisInfo ;
            if (Objects.nonNull(metrics.getRedis().getPattern()) && Objects.equals(metrics.getRedis().getPattern(), CLUSTER)) {
                RedisClusterCollectImpl redisClusterCollect = new RedisClusterCollectImpl();
                redisInfo = redisClusterCollect.getRedisInfo(metrics);
            } else {
                RedisSingleCollectImpl redisSingleCollect = new RedisSingleCollectImpl();
                redisInfo = redisSingleCollect.getRedisInfo(metrics);
            }
            doMetricsData(builder, redisInfo, metrics);
        } catch (RedisConnectionException connectionException) {
            String errorMsg = CommonUtil.getMessageFromThrowable(connectionException);
            log.info("[redis connection] error: {}", errorMsg);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg(errorMsg);
        } catch (Exception e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.warn("[redis collect] error: {}", e.getMessage(), e);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        }

    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_REDIS;
    }

    /**
     * parse redis info
     *
     * @param info redis info
     * @return parsed redis info
     */
    protected Map<String, String> parseInfo(String info) {
        String[] lines = info.split("\n");
        Map<String, String> result = new HashMap<>(128);
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


    /**
     * structure
     * @param redisProtocol
     * @return
     */
    protected RedisURI redisUri(RedisProtocol redisProtocol) {
        RedisURI redisUri = RedisURI.create(redisProtocol.getHost(), Integer.parseInt(redisProtocol.getPort()));
        if (StringUtils.hasText(redisProtocol.getUsername())) {
            redisUri.setUsername(redisProtocol.getUsername());
        }
        if (StringUtils.hasText(redisProtocol.getPassword())) {
            redisUri.setPassword(redisProtocol.getPassword().toCharArray());
        }
        Duration timeout = Duration.ofMillis(CollectUtil.getTimeout(redisProtocol.getTimeout()));
        redisUri.setTimeout(timeout);
        return redisUri;
    }


    /**
     * build redis cache key
     * @param redisProtocol
     * @return
     */
    protected CacheIdentifier doIdentifier(RedisProtocol redisProtocol) {
        return CacheIdentifier.builder()
                .ip(redisProtocol.getHost())
                .port(redisProtocol.getPort())
                .username(redisProtocol.getUsername())
                .password(redisProtocol.getPassword())
                .build();
    }


    /**
     * get redis connection
     * @param identifier
     * @return
     */
    protected StatefulConnection<String, String> getStatefulConnection(CacheIdentifier identifier) {
        StatefulConnection<String, String> connection = null;
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
        return connection;
    }


    /**
     * Build monitoring parameters according to redis info
     * @param builder
     * @param valueMap
     * @param metrics
     */
    private void doMetricsData(CollectRep.MetricsData.Builder builder, Map<String, String> valueMap, Metrics metrics) {
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


    private String removeCr(String value) {
        return value.replace("\r", "");
    }


}
