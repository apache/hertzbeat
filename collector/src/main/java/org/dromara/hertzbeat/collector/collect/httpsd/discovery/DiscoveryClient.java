package org.dromara.hertzbeat.collector.collect.httpsd.discovery;

import org.dromara.hertzbeat.common.entity.job.protocol.HttpsdProtocol;

import java.util.List;

/**
 *
 */
public interface DiscoveryClient extends AutoCloseable {
    ConnectConfig buildConnectConfig(HttpsdProtocol httpsdProtocol);

    void connect(ConnectConfig connectConfig);

    ServerInfo getServerInfo();

    List<ServiceInstance> getServices();
}
