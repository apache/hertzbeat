package org.dromara.hertzbeat.collector.collect.common.cache;

import lombok.extern.slf4j.Slf4j;

import javax.management.remote.JMXConnector;

/**
 * jmx connect object
 * @author huacheng
 **/
@Slf4j
public class JmxConnect implements CacheCloseable {

    private final JMXConnector connection;

    public JmxConnect(JMXConnector connection) {
        this.connection = connection;
    }


    @Override
    public void close() {
        try {
            if (connection != null) {
                connection.close();
            }
        } catch (Exception e) {
            log.error("[connection common cache] close jmx connect error: {}", e.getMessage());
        }
    }

    public JMXConnector getConnection() {
        return connection;
    }
}
