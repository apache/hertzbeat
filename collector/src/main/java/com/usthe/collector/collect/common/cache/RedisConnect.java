package com.usthe.collector.collect.common.cache;

import io.lettuce.core.api.StatefulRedisConnection;
import lombok.extern.slf4j.Slf4j;

/**
 * redis connection
 *
 *
 *
 */
@Slf4j
public class RedisConnect implements CacheCloseable {

    private StatefulRedisConnection<String, String> connection;

    public RedisConnect(StatefulRedisConnection<String, String> connection) {
        this.connection = connection;
    }

    @Override
    public void close() {
        try {
            if (connection != null) {
                connection.closeAsync();
            }
        } catch (Exception e) {
            log.error("close redis connect error: {}", e.getMessage());
        }
    }

    @Override
    protected void finalize() throws Throwable {
        close();
        super.finalize();
    }

    public StatefulRedisConnection<String, String> getConnection() {
        return connection;
    }
}
