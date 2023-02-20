package com.usthe.collector.collect.redis;

import com.usthe.collector.collect.common.cache.CacheIdentifier;
import com.usthe.collector.collect.common.cache.CommonCache;
import com.usthe.collector.collect.common.cache.RedisConnect;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.job.protocol.RedisProtocol;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import io.lettuce.core.cluster.RedisClusterClient;
import io.lettuce.core.cluster.api.StatefulRedisClusterConnection;
import io.lettuce.core.resource.ClientResources;
import io.lettuce.core.resource.DefaultClientResources;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;
import java.util.Objects;

/**
 * @description: Redis 集群指标收集器
 *
 * @create: 2023/02/17
 */
@Slf4j
public class RedisClusterCollectImpl extends RedisCommonCollectImpl {

    private static final String CLUSTER_INFO = "cluster";

    private final ClientResources defaultClientResources;

    public RedisClusterCollectImpl() {
        defaultClientResources = DefaultClientResources.create();
    }


    public Map<String, String> getRedisInfo(Metrics metrics) {
        StatefulRedisClusterConnection<String, String> connection = getConnection(metrics.getRedis());
        String info = connection.sync().info();
        Map<String, String> valueMap = parseInfo(info);
        if (Objects.equals(metrics.getName(), CLUSTER_INFO)) {
            String clusterNodes = connection.sync().clusterInfo();
            valueMap.putAll(parseInfo(clusterNodes));
        }
        if (log.isDebugEnabled()) {
            log.debug("[RedisSingleCollectImpl] fetch redis info");
            valueMap.forEach((k, v) -> log.debug("{} : {}", k, v));
        }
        return valueMap;
    }


    /**
     * obtain StatefulRedisClusterConnection
     *
     * @param redisProtocol
     * @return
     */
    private StatefulRedisClusterConnection<String, String> getConnection(RedisProtocol redisProtocol) {
        CacheIdentifier identifier = doIdentifier(redisProtocol);

        StatefulRedisClusterConnection<String, String> connection = (StatefulRedisClusterConnection<String, String>) getStatefulConnection(identifier);
        if (connection == null) {
            // reuse connection failed, new one
            RedisClusterClient redisClusterClient = buildClient(redisProtocol);
            connection = redisClusterClient.connect();
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
    private RedisClusterClient buildClient(RedisProtocol redisProtocol) {
        return RedisClusterClient.create(defaultClientResources, redisUri(redisProtocol));
    }
}
