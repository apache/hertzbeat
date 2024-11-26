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

import java.util.List;
import org.apache.hertzbeat.collector.collect.registry.discovery.entity.ConnectConfig;
import org.apache.hertzbeat.collector.collect.registry.discovery.entity.ServerInfo;
import org.apache.hertzbeat.collector.collect.registry.discovery.entity.ServiceInstance;
import org.apache.hertzbeat.common.entity.job.protocol.RegistryProtocol;

/**
 * DiscoveryClient interface.
 */
public interface DiscoveryClient extends AutoCloseable {

    /**
     * Build connect config.
     * @param registryProtocol registry protocol.
     * @return connect config object.
     */
    ConnectConfig buildConnectConfig(RegistryProtocol registryProtocol);

    /**
     * Initialize client.
     * @param connectConfig connect config.
     */
    void initClient(ConnectConfig connectConfig);

    /**
     * Get server info.
     * @return server info object.
     */
    ServerInfo getServerInfo();

    /**
     * Get services.
     * @return service instance list.
     */
    List<ServiceInstance> getServices();

    /**
     * Discovery client Health check.
     * @return true if health check pass, otherwise false
     */
    boolean healthCheck();

}
