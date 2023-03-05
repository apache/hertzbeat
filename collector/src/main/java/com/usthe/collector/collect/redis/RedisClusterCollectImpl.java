package com.usthe.collector.collect.redis;

import com.usthe.collector.collect.common.cache.CacheIdentifier;
import com.usthe.collector.collect.common.cache.CommonCache;
import com.usthe.collector.collect.common.cache.RedisConnect;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.job.protocol.RedisProtocol;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import io.lettuce.core.RedisURI;
import io.lettuce.core.cluster.RedisClusterClient;
import io.lettuce.core.cluster.api.StatefulRedisClusterConnection;
import io.lettuce.core.cluster.models.partitions.Partitions;
import io.lettuce.core.cluster.models.partitions.RedisClusterNode;
import io.lettuce.core.resource.ClientResources;
import io.lettuce.core.resource.DefaultClientResources;
import lombok.extern.slf4j.Slf4j;

import java.net.URI;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.usthe.common.util.SignConstants.DOUBLE_MARK;

/**
 * @description: Redis 集群指标收集器
 *
 * @create: 2023/02/17
 */
@Slf4j
public class RedisClusterCollectImpl extends RedisCommonCollectImpl {

    private static final String CLUSTER_INFO = "cluster";

    private static final String UNIQUE_IDENTITY = "identity";

    private final ClientResources defaultClientResources;

    public RedisClusterCollectImpl() {
        defaultClientResources = DefaultClientResources.create();
    }


    public List<Map<String, String>> getRedisInfo(Metrics metrics) {
        Map<String, StatefulRedisClusterConnection<String, String>> connectionMap = getConnectionList(metrics.getRedis());
        List<Map<String, String>> list = new ArrayList<>(connectionMap.size());
        connectionMap.forEach((identity, connection) ->{
            String info = connection.sync().info(metrics.getName());
            Map<String, String> valueMap = parseInfo(info);
            valueMap.put(UNIQUE_IDENTITY, identity);
            if (Objects.equals(metrics.getName(), CLUSTER_INFO)) {
                String clusterNodes = connection.sync().clusterInfo();
                valueMap.putAll(parseInfo(clusterNodes));
            }
            if (log.isDebugEnabled()) {
                log.debug("[RedisSingleCollectImpl] fetch redis info");
                valueMap.forEach((k, v) -> log.debug("{} : {}", k, v));
            }
            list.add(valueMap);
        });
        return list;
    }



    private Map<String, StatefulRedisClusterConnection<String, String>> getConnectionList(RedisProtocol redisProtocol) {

        // first connection
        StatefulRedisClusterConnection<String, String> connection = getConnection(redisProtocol);
        Partitions partitions = connection.getPartitions();
        Map<String, StatefulRedisClusterConnection<String, String>> clusterConnectionMap = new HashMap<>(partitions.size());
        for (RedisClusterNode partition : partitions) {
            RedisURI uri = partition.getUri();
            StatefulRedisClusterConnection<String, String> clusterConnection = getConnection(uri, redisProtocol);
            clusterConnectionMap.put(doUri(uri.getHost(), uri.getPort()), clusterConnection);
        }
        return clusterConnectionMap;
    }





    private StatefulRedisClusterConnection<String, String> getConnection(RedisURI uri, RedisProtocol redisProtocol) {
        redisProtocol.setHost(uri.getHost());
        redisProtocol.setPort(String.valueOf(uri.getPort()));
        return getConnection(redisProtocol);
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

    /**
     * build single identity
     * @param ip
     * @param port
     * @return
     */
    private String doUri(String ip, Integer port) {
        return ip + DOUBLE_MARK + port;
    }
}
