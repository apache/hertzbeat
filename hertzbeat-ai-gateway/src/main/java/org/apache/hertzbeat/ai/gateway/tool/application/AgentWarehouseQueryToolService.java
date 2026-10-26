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

package org.apache.hertzbeat.ai.gateway.tool.application;

import org.apache.hertzbeat.ai.gateway.text.GatewaySecretRedactor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPayloadHasher;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQuery;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.warehouse.db.QueryExecutor;
import org.apache.hertzbeat.warehouse.service.DatasourceQueryService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Configured native PromQL range queries only; never arbitrary URLs, credentials, SQL or executable
 * statements.
 */
@Service
public class AgentWarehouseQueryToolService {
    private final DatasourceQueryService warehouse;
    private final Set<String> datasources;

    public AgentWarehouseQueryToolService(
            DatasourceQueryService warehouse, List<QueryExecutor> executors) {
        this.warehouse = warehouse;
        this.datasources =
                executors.stream()
                        .filter(executor -> executor.support("promql"))
                        .map(QueryExecutor::getDatasource)
                        .collect(java.util.stream.Collectors.toUnmodifiableSet());
    }

    /** A bounded native PromQL range query; epoch timestamps are milliseconds. */
    public record RangeQuery(
            String refId,
            String datasource,
            String expression,
            Long start,
            Long end,
            Integer stepSeconds,
            Integer limit) {}

    @Tool(
            name = "metrics.datasource_catalog",
            description =
                    "List configured native warehouse executors that support PromQL. Names are"
                        + " datasource identifiers, never URLs. Does not contact a datasource or"
                        + " prove availability. SQL and InfluxQL executors are not exposed by this"
                        + " tool.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> catalog() {
        return Map.of(
                "datasources",
                datasources.stream().sorted().toList(),
                "queryLanguage",
                "promql",
                "availabilityProbed",
                false,
                "nativeScope",
                "shared-warehouse");
    }

    @Tool(
            name = "metrics.query_native",
            description =
                    "Execute 1..3 bounded PromQL range queries through the configured native"
                        + " /api/warehouse/query service. Requires administrator native warehouse"
                        + " access; data has the native shared warehouse scope. Use only catalog"
                        + " datasource names; no URL, SQL or credential inputs. Epoch milliseconds"
                        + " >=1000000000000, range <=1 hour, stepSeconds 60..3600, <=61 points per"
                        + " series, limit 1..20. Unique refId. Uses range mode only; instantaneous"
                        + " reads use metrics.realtime. Failed results keep error status and never"
                        + " mean an empty successful dataset.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> query(List<RangeQuery> queries) {
        if (queries == null || queries.isEmpty() || queries.size() > 3)
            throw new IllegalArgumentException("From 1 to 3 bounded native queries are required");
        var refs = new java.util.HashSet<String>();
        var nativeQueries = new java.util.ArrayList<DatasourceQuery>();
        for (var q : queries) {
            validate(q);
            if (!refs.add(q.refId()))
                throw new IllegalArgumentException("Unique query references are required");
            nativeQueries.add(
                    DatasourceQuery.builder()
                            .refId(q.refId())
                            .datasource(q.datasource())
                            .expr(q.expression())
                            .exprType("promql")
                            .timeType("range")
                            .start(q.start())
                            .end(q.end())
                            .step(q.stepSeconds() + "s")
                            .limit(q.limit())
                            .build());
        }
        var results = warehouse.query(nativeQueries);
        if (results == null || results.size() != queries.size())
            throw new IllegalStateException("Native warehouse result set is incomplete");
        var rows = new java.util.ArrayList<Map<String, Object>>();
        var seen = new java.util.HashSet<String>();
        int failed = 0;
        for (var result : results) {
            if (result == null
                    || result.getStatus() == null
                    || !refs.contains(result.getRefId())
                    || !seen.add(result.getRefId()))
                throw new IllegalStateException("Native warehouse query reference mismatch");
            int status = result.getStatus();
            if (status == 200 && result.getFrames() == null) status = 502;
            if (status != 200) {
                failed++;
                rows.add(
                        Map.of(
                                "refId",
                                result.getRefId(),
                                "status",
                                status,
                                "errorCode",
                                "WAREHOUSE_QUERY_FAILED"));
            } else
                rows.add(
                        Map.of(
                                "refId",
                                result.getRefId(),
                                "status",
                                status,
                                "frames",
                                result.getFrames()));
        }
        Map<String, Object> args =
                JsonUtil.fromJson(JsonUtil.toJson(Map.of("queries", queries)), Map.class);
        var projection = AgentManagementOutputSupport.view(rows);
        return Map.of(
                "queryVersion",
                "native-warehouse-query.v1",
                "inputHash",
                AgentToolPayloadHasher.normalizedArgumentsHash(args),
                "nativeScope",
                "shared-warehouse",
                "data",
                projection.get("data"),
                "partial",
                projection.get("partial"),
                "queryCount",
                queries.size(),
                "failedQueries",
                failed);
    }

    private void validate(RangeQuery q) {
        if (q == null
                || q.refId() == null
                || !q.refId().matches("[A-Za-z][A-Za-z0-9_-]{0,31}")
                || q.datasource() == null
                || !datasources.contains(q.datasource())
                || q.expression() == null
                || q.expression().isBlank()
                || q.expression().length() > 2048
                || !Map.of("expression", q.expression())
                        .equals(
                                GatewaySecretRedactor.redactMap(
                                        Map.of("expression", q.expression())))
                || q.start() == null
                || q.end() == null
                || q.start() < 1000000000000L
                || q.end() <= q.start()
                || q.end() - q.start() > 3600000L
                || q.stepSeconds() == null
                || q.stepSeconds() < 60
                || q.stepSeconds() > 3600
                || (q.end() - q.start()) / (q.stepSeconds() * 1000L) > 60
                || q.limit() == null
                || q.limit() < 1
                || q.limit() > 20)
            throw new IllegalArgumentException(
                    "Unsupported datasource or native query exceeds its non-secret range budget");
    }
}
