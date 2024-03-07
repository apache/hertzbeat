package org.dromara.hertzbeat.collector.collect.httpsd.discovery;

import org.dromara.hertzbeat.collector.collect.httpsd.constant.DiscoveryClientInstance;
import org.dromara.hertzbeat.collector.collect.httpsd.discovery.impl.ConsulDiscoveryClient;
import org.dromara.hertzbeat.collector.collect.httpsd.discovery.impl.NacosDiscoveryClient;
import org.dromara.hertzbeat.common.entity.job.protocol.HttpsdProtocol;

import java.util.Objects;

/**
 * @author Calvin
 */
public class DiscoveryClientManagement {

    public DiscoveryClient getClient(HttpsdProtocol httpsdProtocol) {
        return createClient(httpsdProtocol, DiscoveryClientInstance.getByName(httpsdProtocol.getDiscoveryClientTypeName()));
    }

    private DiscoveryClient createClient(HttpsdProtocol httpsdProtocol, DiscoveryClientInstance discoveryClientInstance) {
        if (Objects.equals(discoveryClientInstance, DiscoveryClientInstance.NOT_SUPPORT)) {
            return null;
        }

        return doCreateClient(httpsdProtocol, discoveryClientInstance);
    }

    private DiscoveryClient doCreateClient(HttpsdProtocol httpsdProtocol, DiscoveryClientInstance discoveryClientInstance) {
        DiscoveryClient discoveryClient;
        switch (discoveryClientInstance) {
            case CONSUL:
                discoveryClient = new ConsulDiscoveryClient();
                break;
            case NACOS:
                discoveryClient = new NacosDiscoveryClient();
                break;
            default:
                return null;
        }

        discoveryClient.connect(discoveryClient.buildConnectConfig(httpsdProtocol));
        return discoveryClient;
    }
}
