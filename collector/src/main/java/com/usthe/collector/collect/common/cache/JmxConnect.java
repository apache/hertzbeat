package com.usthe.collector.collect.common.cache;

import lombok.extern.slf4j.Slf4j;

import javax.management.remote.JMXConnector;

/**
 * jmx链接销毁管理
 *
 * @author huacheng
 * @date 2022/7/3 14:58
 **/
@Slf4j
public class JmxConnect implements CacheCloseable {

    private JMXConnector connection;

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
            log.error("close redis connect error: {}", e.getMessage());
        }
    }

    @Override
    protected void finalize() throws Throwable {
        close();
        super.finalize();
    }

    public JMXConnector getConnection() {
        return connection;
    }
}
