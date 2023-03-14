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
import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisConnectionException;
import io.lettuce.core.RedisURI;
import io.lettuce.core.api.StatefulConnection;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.cluster.RedisClusterClient;
import io.lettuce.core.cluster.api.StatefulRedisClusterConnection;
import io.lettuce.core.cluster.models.partitions.Partitions;
import io.lettuce.core.cluster.models.partitions.RedisClusterNode;
import io.lettuce.core.resource.ClientResources;
import io.lettuce.core.resource.DefaultClientResources;
import lombok.extern.slf4j.Slf4j;
import org.springframework.util.Assert;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.util.*;

import static com.usthe.common.util.MapCapUtil.calInitMap;
import static com.usthe.common.util.SignConstants.*;

/**
 * Redis single cluster collector
 *
 * @author <a href="mailto:Musk.Chen@fanruan.com">Musk.Chen</a> , hdd
 * @version 1.0
 * @date 2022/5/17
 */
@Slf4j
public class RedisCommonCollectImpl extends AbstractCollect {


    private static final String CLUSTER = "3";

    private static final String CLUSTER_INFO = "cluster";

    private static final String UNIQUE_IDENTITY = "identity";

    private final ClientResources defaultClientResources;

    public RedisCommonCollectImpl() {
        defaultClientResources = DefaultClientResources.create();
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
            if (Objects.nonNull(metrics.getRedis().getPattern()) && Objects.equals(metrics.getRedis().getPattern(), CLUSTER)) {
                List<Map<String, String>> redisInfoList = getClusterRedisInfo(metrics);
                doMetricsDataList(builder, redisInfoList, metrics);
            } else {
                Map<String, String> redisInfo = getSingleRedisInfo(metrics);
                doMetricsData(builder, redisInfo, metrics);
            }
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

    /**
     * get single redis metrics data
     * @param metrics metrics config
     * @return data
     */
    private Map<String, String> getSingleRedisInfo(Metrics metrics) {
        StatefulRedisConnection<String, String> connection = getSingleConnection(metrics.getRedis());
        String info = connection.sync().info(metrics.getName());
        Map<String, String> valueMap = parseInfo(info);
        if (log.isDebugEnabled()) {
            log.debug("[RedisSingleCollectImpl] fetch redis info");
            valueMap.forEach((k, v) -> log.debug("{} : {}", k, v));
        }
        return valueMap;
    }

    /**
     * get cluster redis metrics data
     * @param metrics metrics config
     * @return data
     */
    private List<Map<String, String>> getClusterRedisInfo(Metrics metrics) {
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

    /**
     * Build monitoring parameters according to redis info
     * @param builder builder
     * @param valueMapList map list
     * @param metrics metrics
     */
    private void doMetricsDataList(CollectRep.MetricsData.Builder builder, List<Map<String, String>> valueMapList, Metrics metrics) {
        valueMapList.forEach(e -> doMetricsData(builder, e, metrics));
    }

    /**
     * Build monitoring parameters according to redis info
     * @param builder builder
     * @param valueMap map value
     * @param metrics metrics
     */
    private void doMetricsData(CollectRep.MetricsData.Builder builder, Map<String, String> valueMap, Metrics metrics) {
        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
        metrics.getAliasFields().forEach(it -> {
            if (valueMap.containsKey(it)) {
                String fieldValue = valueMap.get(it);
                valueRowBuilder.addColumns(Objects.requireNonNullElse(fieldValue, CommonConstants.NULL_VALUE));
            } else {
                valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
            }
        });
        builder.addValues(valueRowBuilder.build());
    }

    /**
     * get single connection
     * @param redisProtocol protocol
     * @return connection
     */
    private StatefulRedisConnection<String, String> getSingleConnection(RedisProtocol redisProtocol) {
        CacheIdentifier identifier = doIdentifier(redisProtocol);
        StatefulRedisConnection<String, String> connection = (StatefulRedisConnection<String, String>) getStatefulConnection(identifier);
        if (Objects.isNull(connection)) {
            // reuse connection failed, new one
            RedisClient redisClient = buildSingleClient(redisProtocol);
            connection = redisClient.connect();
            CommonCache.getInstance().addCache(identifier, new RedisConnect(connection));
        }
        return connection;
    }

    /**
     * get cluster connect list
     * @param redisProtocol protocol
     * @return connection map
     */
    private Map<String, StatefulRedisClusterConnection<String, String>> getConnectionList(RedisProtocol redisProtocol) {
        // first connection
        StatefulRedisClusterConnection<String, String> connection = getClusterConnection(redisProtocol);
        Partitions partitions = connection.getPartitions();
        Map<String, StatefulRedisClusterConnection<String, String>> clusterConnectionMap = new HashMap<>(partitions.size());
        for (RedisClusterNode partition : partitions) {
            RedisURI uri = partition.getUri();
            redisProtocol.setHost(uri.getHost());
            redisProtocol.setPort(String.valueOf(uri.getPort()));
            StatefulRedisClusterConnection<String, String> clusterConnection = getClusterConnection(redisProtocol);
            clusterConnectionMap.put(doUri(uri.getHost(), uri.getPort()), clusterConnection);
        }
        return clusterConnectionMap;
    }

    /**
     * obtain StatefulRedisClusterConnection
     *
     * @param redisProtocol redis protocol
     * @return cluster connection
     */
    private StatefulRedisClusterConnection<String, String> getClusterConnection(RedisProtocol redisProtocol) {
        CacheIdentifier identifier = doIdentifier(redisProtocol);
        StatefulRedisClusterConnection<String, String> connection = (StatefulRedisClusterConnection<String, String>) getStatefulConnection(identifier);
        if (connection == null) {
            // reuse connection failed, new one
            RedisClusterClient redisClusterClient = buildClusterClient(redisProtocol);
            connection = redisClusterClient.connect();
            CommonCache.getInstance().addCache(identifier, new RedisConnect(connection));
        }
        return connection;
    }

    /**
     * get redis connection
     *
     * @param identifier identifier
     * @return connection
     */
    private StatefulConnection<String, String> getStatefulConnection(CacheIdentifier identifier) {
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
     * build cluster redis client
     *
     * @param redisProtocol redis protocol config
     * @return redis cluster client
     */
    private RedisClusterClient buildClusterClient(RedisProtocol redisProtocol) {
        return RedisClusterClient.create(defaultClientResources, redisUri(redisProtocol));
    }

    /**
     * build single redis client
     *
     * @param redisProtocol redis protocol config
     * @return redis single client
     */
    private RedisClient buildSingleClient(RedisProtocol redisProtocol) {
        return RedisClient.create(defaultClientResources, redisUri(redisProtocol));
    }

    private RedisURI redisUri(RedisProtocol redisProtocol) {
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

    private String removeCr(String value) {
        return value.replace(CARRIAGE_RETURN, "");
    }

    private String doUri(String ip, Integer port) {
        return ip + DOUBLE_MARK + port;
    }

    private CacheIdentifier doIdentifier(RedisProtocol redisProtocol) {
        return CacheIdentifier.builder()
                .ip(redisProtocol.getHost())
                .port(redisProtocol.getPort())
                .username(redisProtocol.getUsername())
                .password(redisProtocol.getPassword())
                .build();
    }

    private Map<String, String> parseInfo(String info) {
        String[] lines = info.split(LINE_FEED);
        Map<String, String> result = new HashMap<>(calInitMap(lines.length));
        Arrays.stream(lines)
                .filter(it -> StringUtils.hasText(it) && !it.startsWith(WELL_NO) && it.contains(DOUBLE_MARK))
                .map(this::removeCr)
                .map(r -> r.split(DOUBLE_MARK))
                .forEach(it -> {
                    if (it.length > 1) {
                        result.put(it[0], it[1]);
                    }
                });
        return result;
    }

    private void preCheck(Metrics metrics) {
        if (metrics == null || metrics.getRedis() == null) {
            throw new IllegalArgumentException("Redis collect must has redis params");
        }
        RedisProtocol redisProtocol = metrics.getRedis();
        Assert.hasText(redisProtocol.getHost(), "Redis Protocol host is required.");
        Assert.hasText(redisProtocol.getPort(), "Redis Protocol port is required.");
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_REDIS;
    }

}
