/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.metrics.inventory.greptime;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.apache.hertzbeat.observability.metrics.inventory.MetricInventoryRepository;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

/** Greptime metric inventory adapter based on logical-table metadata and exact physical-row scope. */
@Repository
public class GreptimeMetricInventoryRepository implements MetricInventoryRepository {

    private static final int MAX_LIMIT = 64;
    private static final Pattern METRIC_NAME = Pattern.compile("[A-Za-z_:][A-Za-z0-9_:]*");
    private static final Logger LOG = LoggerFactory.getLogger(GreptimeMetricInventoryRepository.class);

    private final ObjectProvider<GreptimeSqlQueryExecutor> executorProvider;

    public GreptimeMetricInventoryRepository(ObjectProvider<GreptimeSqlQueryExecutor> executorProvider) {
        this.executorProvider = executorProvider;
    }

    @Override
    public Result findMetricNames(Query query) {
        if (!supports(query)) {
            return Result.unsupported();
        }
        GreptimeSqlQueryExecutor executor;
        try {
            executor = executorProvider.getIfAvailable();
        } catch (RuntimeException exception) {
            logFailure(exception);
            return Result.failure();
        }
        if (executor == null) {
            return Result.unsupported();
        }
        try {
            List<Map<String, Object>> rows = executor.executeStrict(buildQuery(query));
            Set<String> names = new LinkedHashSet<>();
            for (Map<String, Object> row : rows) {
                String name = row == null ? null : metricName(row.get("table_name"));
                if (StringUtils.hasText(name) && !"greptime_physical_table".equals(name)) {
                    names.add(name);
                }
            }
            return Result.success(new ArrayList<>(names));
        } catch (RuntimeException exception) {
            logFailure(exception);
            return Result.failure();
        }
    }

    private boolean supports(Query query) {
        return query != null
                && StringUtils.hasText(query.serviceName())
                && StringUtils.hasText(query.serviceNamespace())
                && StringUtils.hasText(query.environment())
                && query.start() >= 0
                && query.end() >= query.start()
                && query.limit() > 0;
    }

    private String buildQuery(Query query) {
        List<String> filters = new ArrayList<>();
        filters.add(equalsColumn("p.service_name", query.serviceName()));
        filters.add(equalsColumn("p.service_namespace", query.serviceNamespace()));
        filters.add(equalsColumn("p.deployment_environment_name", query.environment()));
        addOptionalEqualsColumn(filters, "p.hertzbeat_collector_id", query.collectorId());
        addOptionalEqualsColumn(filters, "p.service_instance_id", query.instance());
        addOptionalEqualsColumn(filters, "p.http_route", query.endpoint());
        filters.add("p.greptime_timestamp >= to_timestamp_millis(" + query.start() + ")");
        filters.add("p.greptime_timestamp < to_timestamp_millis(" + inclusiveEnd(query.end()) + ")");
        return "SELECT DISTINCT t.table_name AS table_name"
                + " FROM greptime_physical_table AS p"
                + " JOIN information_schema.tables AS t ON p.__table_id = t.table_id"
                + " WHERE " + String.join(" AND ", filters)
                + " ORDER BY t.table_name"
                + " LIMIT " + Math.min(query.limit(), MAX_LIMIT);
    }

    private long inclusiveEnd(long end) {
        return end == Long.MAX_VALUE ? Long.MAX_VALUE : end + 1;
    }

    private void addOptionalEqualsColumn(List<String> filters, String column, String value) {
        if (StringUtils.hasText(value)) {
            filters.add(equalsColumn(column, value));
        }
    }

    private String equalsColumn(String column, String value) {
        return column + " = '" + value.replace("'", "''") + "'";
    }

    private String metricName(Object value) {
        if (value == null) {
            return null;
        }
        String candidate = value.toString();
        return METRIC_NAME.matcher(candidate).matches() ? candidate : null;
    }

    private void logFailure(RuntimeException exception) {
        LOG.warn("{}: {}", Result.INVENTORY_UNAVAILABLE, exception.getClass().getSimpleName());
    }
}
