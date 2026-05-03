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

package org.apache.hertzbeat.warehouse.listener;

import java.time.temporal.TemporalAmount;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.math.NumberUtils;
import org.apache.hertzbeat.common.util.TimePeriodUtil;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Apply Greptime database ttl after application startup.
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "warehouse.store.greptime", name = "enabled", havingValue = "true")
public class GreptimeTtlApplicationReadyListener {

    private static final Pattern DAY_PATTERN = Pattern.compile("^(\\d+)[dD]$");

    private final GreptimeProperties greptimeProperties;
    private final GreptimeSqlQueryExecutor greptimeSqlQueryExecutor;

    public GreptimeTtlApplicationReadyListener(GreptimeProperties greptimeProperties,
                                               GreptimeSqlQueryExecutor greptimeSqlQueryExecutor) {
        this.greptimeProperties = greptimeProperties;
        this.greptimeSqlQueryExecutor = greptimeSqlQueryExecutor;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void listen() {
        String expireTime = normalizeExpireTime(greptimeProperties.expireTime());
        if (expireTime == null) {
            return;
        }
        String database = greptimeProperties.database();
        if (!StringUtils.hasText(database)) {
            log.warn("[warehouse greptime] skip startup ttl init because database is blank.");
            return;
        }
        String databaseName = database.trim();
        String sql = "ALTER DATABASE " + databaseName + " SET 'ttl'='" + expireTime + "'";
        try {
            greptimeSqlQueryExecutor.execute(sql);
            log.info("[warehouse greptime] applied startup database ttl {} for {}.", expireTime, databaseName);
        } catch (Exception ex) {
            log.warn("[warehouse greptime] failed to apply startup database ttl {} for {}: {}",
                    expireTime, databaseName, ex.getMessage());
        }
    }

    static String normalizeExpireTime(String expireTime) {
        if (!StringUtils.hasText(expireTime)) {
            return null;
        }
        String normalized = expireTime.trim();
        if (NumberUtils.isParsable(normalized) || DAY_PATTERN.matcher(normalized).matches()) {
            return normalized;
        }
        try {
            TemporalAmount ignored = TimePeriodUtil.parseTokenTime(normalized);
            return normalized;
        } catch (Exception ex) {
            log.warn("[warehouse greptime] invalid expire-time {}, skip startup ttl init.", normalized);
            return null;
        }
    }
}
