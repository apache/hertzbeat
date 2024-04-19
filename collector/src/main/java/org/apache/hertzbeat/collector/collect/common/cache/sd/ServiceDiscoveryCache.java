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

package org.apache.hertzbeat.collector.collect.common.cache.sd;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.google.common.collect.Lists;
import org.apache.commons.lang3.StringUtils;
import org.springframework.util.CollectionUtils;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * SD Cache
 */
public class ServiceDiscoveryCache {
    private static final Cache<Long, List<ConnectionConfig>> sd = Caffeine.newBuilder().build();

    public static List<ConnectionConfig> getConfig(Long jobId) {
        return sd.get(jobId, id -> Lists.newArrayList());
    }

    public static void updateConfig(Long jobId, List<ConnectionConfig> configList) {
        if (Objects.isNull(jobId) || CollectionUtils.isEmpty(configList)) {
            return;
        }

        sd.put(jobId, configList.stream()
                .filter(config -> StringUtils.isNoneBlank(config.getHost(), config.getPort()))
                .collect(Collectors.toList()));
    }

    public static void removeConfig(Long jobId) {
        sd.invalidate(jobId);
    }
}
