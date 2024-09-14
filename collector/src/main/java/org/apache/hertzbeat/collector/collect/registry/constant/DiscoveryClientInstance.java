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

package org.apache.hertzbeat.collector.collect.registry.constant;

import java.util.Arrays;
import org.apache.commons.lang3.StringUtils;

/**
 * Discovery Client Instance Name For Http_sd monitor
 */
public enum DiscoveryClientInstance {
    CONSUL("Consul"),
    NACOS("Nacos"),
    NOT_SUPPORT("Not support discovery client instance!");

    private final String name;

    DiscoveryClientInstance(String name) {
        this.name = name;
    }

    public static DiscoveryClientInstance getByName(String clientInstanceName) {
        return Arrays.stream(DiscoveryClientInstance.values())
                .filter(instance -> StringUtils.equalsIgnoreCase(instance.name, clientInstanceName))
                .findFirst()
                .orElse(DiscoveryClientInstance.NOT_SUPPORT);
    }

}
