/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.collector.collect.registry.discovery.impl;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.registry.constant.DiscoveryClientHealthStatus;
import org.apache.hertzbeat.collector.collect.registry.discovery.DiscoveryClient;
import org.apache.hertzbeat.collector.collect.registry.discovery.entity.ConnectConfig;
import org.apache.hertzbeat.collector.collect.registry.discovery.entity.ServerInfo;
import org.apache.hertzbeat.collector.collect.registry.discovery.entity.ServiceInstance;
import org.apache.hertzbeat.common.entity.job.protocol.RegistryProtocol;
import org.xbill.DNS.AAAARecord;
import org.xbill.DNS.ARecord;
import org.xbill.DNS.CNAMERecord;
import org.xbill.DNS.Lookup;
import org.xbill.DNS.Record;
import org.xbill.DNS.SRVRecord;
import org.xbill.DNS.SimpleResolver;
import org.xbill.DNS.Type;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * DiscoveryClient impl of Dns
 */
@Slf4j
public class DnsDiscoveryClient implements DiscoveryClient {

    private static final Integer DEFAULT_TIMEOUT = 5;

    private ConnectConfig connectConfig;
    private SimpleResolver dnsResolver;

    @Override
    public ConnectConfig buildConnectConfig(RegistryProtocol registryProtocol) {
        return ConnectConfig.builder().host(registryProtocol.getHost()).port(Integer.parseInt(registryProtocol.getPort())).build();

    }

    @Override
    public void initClient(ConnectConfig connectConfig) {
        this.connectConfig = connectConfig;
        try {
            this.dnsResolver = new SimpleResolver(connectConfig.getHost());
            this.dnsResolver.setPort(connectConfig.getPort());
            this.dnsResolver.setTimeout(Duration.ofMillis(DEFAULT_TIMEOUT));
        } catch (Exception e) {
            log.error("Init DNS resolver error: {}", e.getMessage());
            throw new RuntimeException("Init DNS client failed");
        }
    }

    @Override
    public ServerInfo getServerInfo() {
        return ServerInfo.builder()
                .address(connectConfig.getHost())
                .port(String.valueOf(connectConfig.getPort()))
                .build();
    }

    @Override
    public List<ServiceInstance> getServices() {
        if (connectConfig == null || dnsResolver == null) {
            log.error("DNS client not initialized");
            return Collections.emptyList();
        }
        String domain = connectConfig.getHost();
        int recordType = Type.SRV; // 默认 SRV 记录
        try {
            // 1. 查询 SRV 记录
            Lookup lookup = new Lookup(domain, recordType);
            lookup.setResolver(dnsResolver);
            lookup.setCache(null); // 禁用缓存，获取实时结果
            org.xbill.DNS.Record[] records = lookup.run();
            if (lookup.getResult() != Lookup.SUCCESSFUL) {
                log.error("DNS lookup failed: {}", lookup.getErrorString());
                return Collections.emptyList();
            }
            List<ServiceInstance> instances = new ArrayList<>();
            for (org.xbill.DNS.Record record : records) {
                if (!(record instanceof SRVRecord srvRecord)) {
                    continue;
                }
                String target = srvRecord.getTarget().toString();
                int port = srvRecord.getPort();
                // 2. 查询 A / AAAA 记录
                List<String> addresses = resolveHostAddresses(target);
                if (addresses.isEmpty()) {
                    log.warn("No IP found for host: {}", target);
                    continue;
                }
                // 3. 构建实例
                for (String ip : addresses) {
                    ServiceInstance instance = ServiceInstance.builder().serviceId(target + ":" + port).serviceName(domain).address(ip).port(port).healthStatus(DiscoveryClientHealthStatus.UP)
                            .metadata(Collections.singletonMap("dns.target", target)).build();
                    instances.add(instance);
                }
            }
            return instances;
        } catch (Exception e) {
            log.error("DNS query error: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    @Override
    public boolean healthCheck() {
        try {
            // 通过查询 SOA 记录检查 DNS 服务
            Lookup lookup = new Lookup(connectConfig.getHost(), Type.SOA);
            lookup.setResolver(dnsResolver);
            lookup.run();
            return lookup.getResult() == Lookup.SUCCESSFUL;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public void close() throws Exception {
        // DNS 无持久连接，无需特殊处理
    }

    /**
     * 解析主机名的 IP 地址（A/AAAA 记录）
     */
    private List<String> resolveHostAddresses(String host) {
        List<String> addresses = new ArrayList<>();
        try {
            Lookup lookup = new Lookup(host, Type.ANY);
            lookup.setResolver(dnsResolver);
            lookup.run();
            for (Record record : lookup.getAnswers()) {
                if (record instanceof CNAMERecord cname) {
                    addresses.addAll(resolveHostAddresses(cname.getTarget().toString()));
                } else if (record instanceof ARecord a) {
                    addresses.add(a.getAddress().getHostAddress());
                } else if (record instanceof AAAARecord aaaa) {
                    addresses.add(aaaa.getAddress().getHostAddress());
                }
            }
        } catch (Exception e) {
            log.error("Resolve CNAME chain error: {}", e.getMessage());
        }
        return addresses;
    }
}
