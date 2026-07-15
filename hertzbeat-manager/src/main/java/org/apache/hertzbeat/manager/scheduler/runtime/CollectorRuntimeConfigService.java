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

package org.apache.hertzbeat.manager.scheduler.runtime;

import java.time.Duration;
import java.util.Optional;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeConfig;
import org.apache.hertzbeat.common.entity.manager.Collector;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Persists product-level runtime intent for registered Collectors.
 */
@Service
public class CollectorRuntimeConfigService {

    private static final ManagedOtelRuntimeConfig DEFAULT_CONFIG = new ManagedOtelRuntimeConfig(
            ManagedOtelRuntimeConfig.CURRENT_SCHEMA_VERSION, 1, true, Duration.ofSeconds(10));

    private final CollectorDao collectorDao;

    public CollectorRuntimeConfigService(CollectorDao collectorDao) {
        this.collectorDao = collectorDao;
    }

    @Transactional(readOnly = true)
    public Optional<ManagedOtelRuntimeConfig> current(String collectorName) {
        return collectorDao.findCollectorByName(collectorName).map(this::read);
    }

    @Transactional(rollbackFor = Exception.class)
    public ManagedOtelRuntimeConfig update(String collectorName, ManagedOtelRuntimeConfig config) {
        if (config.schemaVersion() != ManagedOtelRuntimeConfig.CURRENT_SCHEMA_VERSION) {
            throw new CommonException("Only the current runtime configuration schema can be persisted");
        }
        Collector collector = collectorDao.findCollectorByName(collectorName)
                .orElseThrow(() -> new CommonException("Collector not found: " + collectorName));
        ManagedOtelRuntimeConfig current = read(collector);
        if (config.revision() <= current.revision()) {
            throw new CommonException("Runtime configuration revision must increase");
        }
        collector.setRuntimeConfig(JsonUtil.toJson(config));
        collectorDao.save(collector);
        return config;
    }

    private ManagedOtelRuntimeConfig read(Collector collector) {
        if (StringUtils.isBlank(collector.getRuntimeConfig())) {
            return DEFAULT_CONFIG;
        }
        ManagedOtelRuntimeConfig config = JsonUtil.fromJson(
                collector.getRuntimeConfig(), ManagedOtelRuntimeConfig.class);
        if (config == null) {
            throw new CommonException("Stored runtime configuration is invalid");
        }
        return config;
    }
}
