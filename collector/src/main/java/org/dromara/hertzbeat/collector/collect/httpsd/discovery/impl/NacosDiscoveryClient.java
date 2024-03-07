package org.dromara.hertzbeat.collector.collect.httpsd.discovery.impl;

import com.alibaba.nacos.api.exception.NacosException;
import com.alibaba.nacos.api.naming.NamingFactory;
import com.alibaba.nacos.api.naming.NamingService;
import com.google.common.collect.Lists;
import org.dromara.hertzbeat.collector.collect.httpsd.discovery.ConnectConfig;
import org.dromara.hertzbeat.collector.collect.httpsd.discovery.DiscoveryClient;
import org.dromara.hertzbeat.collector.collect.httpsd.discovery.ServerInfo;
import org.dromara.hertzbeat.collector.collect.httpsd.discovery.ServiceInstance;
import org.dromara.hertzbeat.common.entity.job.protocol.HttpsdProtocol;

import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * DiscoveryClient impl of Nacos
 * @author Calvin
 */
public class NacosDiscoveryClient implements DiscoveryClient {
    private NamingService namingService;
    private ConnectConfig localConnectConfig;

    @Override
    public ConnectConfig buildConnectConfig(HttpsdProtocol httpsdProtocol) {
        return ConnectConfig.builder()
                .host(httpsdProtocol.getHost())
                .port(Integer.parseInt(httpsdProtocol.getPort()))
                .build();
    }

    @Override
    public void connect(ConnectConfig connectConfig) {
        try {
            localConnectConfig = connectConfig;
            namingService = NamingFactory.createNamingService(connectConfig.getHost() + ":" + connectConfig.getPort());
        }catch (NacosException exception) {
            throw new RuntimeException("Failed to init namingService");
        }
    }

    @Override
    public ServerInfo getServerInfo() {
        if (Objects.isNull(namingService)) {
            return new ServerInfo();
        }

        return ServerInfo.builder()
                .address(localConnectConfig.getHost())
                .port(String.valueOf(localConnectConfig.getPort()))
                .build();
    }

    @Override
    public List<ServiceInstance> getServices() {
        if (Objects.isNull(namingService)) {
            return Collections.emptyList();
        }

        List<ServiceInstance> serviceInstanceList = Lists.newArrayList();
        try {
            for (String serviceName : namingService.getServicesOfServer(0, 9999).getData()) {
                namingService.getAllInstances(serviceName).forEach(instance ->
                        serviceInstanceList.add(ServiceInstance.builder()
                                .serviceId(instance.getInstanceId())
                                .serviceName(instance.getServiceName())
                                .address(instance.getIp())
                                .port(String.valueOf(instance.getPort()))
                                .healthStatus(instance.isHealthy() ? "UP" : "DOWN")
                                .build()));
            }
        } catch (NacosException e) {
            throw new RuntimeException("Failed to fetch instance info");
        }

        return serviceInstanceList;
    }

    @Override
    public void close() {
        if (namingService == null) {
            return;
        }

        try {
            namingService.shutDown();
        }catch (NacosException ignore) {
        }
    }
}
