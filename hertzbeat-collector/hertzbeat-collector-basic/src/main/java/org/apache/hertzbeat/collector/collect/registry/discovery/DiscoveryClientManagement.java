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

package org.apache.hertzbeat.collector.collect.registry.discovery;

import java.util.Objects;
import org.apache.hertzbeat.collector.collect.registry.constant.DiscoveryClientInstance;
import org.apache.hertzbeat.collector.collect.registry.discovery.impl.ConsulDiscoveryClient;
import org.apache.hertzbeat.collector.collect.registry.discovery.impl.NacosDiscoveryClient;
import org.apache.hertzbeat.common.entity.job.protocol.RegistryProtocol;

/**
 * Discovery Client Management
 */
public class DiscoveryClientManagement {

    public DiscoveryClient getClient(RegistryProtocol registryProtocol) {
        return createClient(registryProtocol, DiscoveryClientInstance.getByName(registryProtocol.getDiscoveryClientTypeName()));
    }

    private DiscoveryClient createClient(RegistryProtocol registryProtocol, DiscoveryClientInstance discoveryClientInstance) {
        if (Objects.equals(discoveryClientInstance, DiscoveryClientInstance.NOT_SUPPORT)) {
            return null;
        }

        return doCreateClient(registryProtocol, discoveryClientInstance);
    }

    private DiscoveryClient doCreateClient(RegistryProtocol registryProtocol, DiscoveryClientInstance discoveryClientInstance) {
        DiscoveryClient discoveryClient;
        switch (discoveryClientInstance) {
            case CONSUL -> discoveryClient = new ConsulDiscoveryClient();
            case NACOS -> discoveryClient = new NacosDiscoveryClient();
            default -> { return null; }
        }
        discoveryClient.initClient(discoveryClient.buildConnectConfig(registryProtocol));
        return discoveryClient;
    }
}
