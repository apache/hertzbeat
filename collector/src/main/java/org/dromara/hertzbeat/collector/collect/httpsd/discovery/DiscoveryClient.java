package org.dromara.hertzbeat.collector.collect.httpsd.discovery;

import org.dromara.hertzbeat.common.entity.job.protocol.HttpsdProtocol;

import java.util.List;

/**
 * DiscoveryClient interface
 */
public interface DiscoveryClient extends AutoCloseable {
    ConnectConfig buildConnectConfig(HttpsdProtocol httpsdProtocol);

    void initClient(ConnectConfig connectConfig);

    ServerInfo getServerInfo();

    List<ServiceInstance> getServices();
}
