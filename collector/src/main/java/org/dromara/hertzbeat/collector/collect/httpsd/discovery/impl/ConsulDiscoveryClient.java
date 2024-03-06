package org.dromara.hertzbeat.collector.collect.httpsd.discovery.impl;

import com.ecwid.consul.v1.ConsulClient;
import com.ecwid.consul.v1.agent.model.Check;
import com.ecwid.consul.v1.agent.model.Self;
import com.ecwid.consul.v1.agent.model.Service;
import com.google.common.collect.Lists;
import org.apache.commons.lang3.StringUtils;
import org.dromara.hertzbeat.collector.collect.httpsd.discovery.ConnectConfig;
import org.dromara.hertzbeat.collector.collect.httpsd.discovery.DiscoveryClient;
import org.dromara.hertzbeat.collector.collect.httpsd.discovery.ServerInfo;
import org.dromara.hertzbeat.collector.collect.httpsd.discovery.ServiceInstance;
import org.dromara.hertzbeat.common.entity.job.protocol.HttpsdProtocol;

import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * DiscoveryClient impl of Consul
 * @author Calvin
 */
public class ConsulDiscoveryClient implements DiscoveryClient {
    private ConsulClient consulClient;

    @Override
    public ConnectConfig buildConnectConfig(HttpsdProtocol httpsdProtocol) {
        return ConnectConfig.builder()
                .host(httpsdProtocol.getHost())
                .port(Integer.parseInt(httpsdProtocol.getPort()))
                .build();
    }

    @Override
    public void connect(ConnectConfig connectConfig) {
        consulClient = new ConsulClient(connectConfig.getHost(), connectConfig.getPort());
    }

    @Override
    public ServerInfo getServerInfo() {
        Self self = consulClient.getAgentSelf().getValue();
        return ServerInfo.builder()
                .address(self.getMember().getAddress())
                .port(String.valueOf(self.getMember().getPort()))
                .build();
    }

    @Override
    public List<ServiceInstance> getServices() {
        Map<String, Service> serviceMap = consulClient.getAgentServices().getValue();
        List<ServiceInstance> serviceInstanceList = Lists.newArrayListWithExpectedSize(serviceMap.size());
        Collection<Check> healthCheckList = consulClient.getAgentChecks().getValue().values();

        serviceMap.forEach((serviceId, instance) -> {
            serviceInstanceList.add(ServiceInstance.builder()
                    .serviceId(serviceId)
                    .serviceName(instance.getService())
                    .address(instance.getAddress())
                    .port(String.valueOf(instance.getPort()))
                    .healthStatus(getHealthStatus(serviceId, healthCheckList))
                    .build());
        });

        return serviceInstanceList;
    }

    @Override
    public void close() {
    }

    private String getHealthStatus(String serviceId, Collection<Check> healthCheckList) {
        return healthCheckList.stream()
                .filter(healthCheck -> StringUtils.equals(healthCheck.getServiceId(), serviceId))
                .findFirst()
                .map(check -> check.getStatus().name())
                .orElse("");
    }
}
