/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.collector.dispatch.entrance.sd;

import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import org.apache.hertzbeat.collector.collect.common.cache.sd.ConnectionConfig;
import org.apache.hertzbeat.common.entity.sd.ServiceDiscoveryProtocol;

import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Service Discovery Fetcher
 */
public class ServiceDiscoveryFetcher {
    private static final Map<ServiceDiscoveryProtocol.Type, ServiceDiscoveryFetchStrategy> strategyMap = Maps.newHashMap();

    public static List<ConnectionConfig> doFetch(ServiceDiscoveryProtocol sdProtocol) {
        ServiceDiscoveryFetchStrategy updateStrategy = strategyMap.get(sdProtocol.getType());
        if (Objects.isNull(updateStrategy)) {
            return Lists.newArrayList();
        }

        return updateStrategy.fetch(sdProtocol.getSdSource());
    }

    public static void addMap(ServiceDiscoveryFetchStrategy updateStrategy) {
        strategyMap.put(updateStrategy.getType(), updateStrategy);
    }
}
