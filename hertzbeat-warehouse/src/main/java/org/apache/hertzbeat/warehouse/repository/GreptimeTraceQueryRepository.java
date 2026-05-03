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

package org.apache.hertzbeat.warehouse.repository;

import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeSqlQueryContent;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Repository;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriUtils;

/**
 * Greptime-backed trace row repository.
 */
@Repository
@RequiredArgsConstructor
@Slf4j
public class GreptimeTraceQueryRepository implements TraceQueryRepository {

    private static final String TRACE_TABLE = "hzb_traces";
    private static final String GREPTIME_QUERY_PATH = "/v1/sql";
    private static final String TRACE_SELECT_COLUMNS = "*";
    private static final String SELF_TELEMETRY_SERVICE_FILTER =
            "LOWER(service_name) NOT IN ('hertzbeat', 'apache-hertzbeat')";

    private final ObjectProvider<GreptimeSqlQueryExecutor> greptimeSqlQueryExecutorProvider;
    private final GreptimeProperties greptimeProperties;
    private final RestTemplate restTemplate;

    @Override
    public List<Map<String, Object>> queryRecentTraceRows(int limit) {
        return queryRecentTraceRows(limit, null, false);
    }

    @Override
    public List<Map<String, Object>> queryRecentTraceRows(int limit, String serviceName, Boolean hideInternal) {
        StringBuilder sql = new StringBuilder("SELECT ")
                .append(TRACE_SELECT_COLUMNS)
                .append(" FROM ")
                .append(TRACE_TABLE);
        List<String> filters = new LinkedList<>();
        if (StringUtils.hasText(serviceName)) {
            filters.add("service_name = '" + escapeSql(serviceName) + "'");
        }
        if (Boolean.TRUE.equals(hideInternal)) {
            filters.add(SELF_TELEMETRY_SERVICE_FILTER);
        }
        if (!filters.isEmpty()) {
            sql.append(" WHERE ").append(String.join(" AND ", filters));
        }
        sql.append(" ORDER BY timestamp DESC LIMIT ").append(Math.max(limit, 1));
        return queryRows(sql.toString());
    }

    @Override
    public List<Map<String, Object>> queryTraceRows(String traceId, int limit) {
        return queryRows("SELECT " + TRACE_SELECT_COLUMNS + " FROM " + TRACE_TABLE
                + " WHERE trace_id = '" + escapeSql(traceId)
                + "' ORDER BY timestamp ASC LIMIT " + Math.max(limit, 1));
    }

    private List<Map<String, Object>> queryRows(String sql) {
        GreptimeSqlQueryExecutor executor = greptimeSqlQueryExecutorProvider.getIfAvailable();
        if (executor != null) {
            try {
                return executor.execute(sql);
            } catch (Exception ex) {
                log.warn("Query trace rows failed, sql={}, message={}", sql, ex.getMessage());
                return Collections.emptyList();
            }
        }
        if (greptimeProperties == null || !StringUtils.hasText(greptimeProperties.httpEndpoint())) {
            return Collections.emptyList();
        }
        return queryRowsByGreptimeHttp(sql);
    }

    private List<Map<String, Object>> queryRowsByGreptimeHttp(String sql) {
        try {
            String endpoint = greptimeProperties.httpEndpoint();
            String url = endpoint.endsWith("/") ? endpoint.substring(0, endpoint.length() - 1) : endpoint;
            url += GREPTIME_QUERY_PATH;
            if (StringUtils.hasText(greptimeProperties.database())) {
                url += "?db=" + UriUtils.encodeQueryParam(greptimeProperties.database(), StandardCharsets.UTF_8);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            if (StringUtils.hasText(greptimeProperties.username()) && StringUtils.hasText(greptimeProperties.password())) {
                headers.setBasicAuth(greptimeProperties.username(), greptimeProperties.password(), StandardCharsets.UTF_8);
            }
            HttpEntity<String> httpEntity = new HttpEntity<>(
                    "sql=" + UriUtils.encodeQueryParam(sql, StandardCharsets.UTF_8),
                    headers
            );
            ResponseEntity<GreptimeSqlQueryContent> responseEntity = restTemplate.exchange(
                    url, HttpMethod.POST, httpEntity, GreptimeSqlQueryContent.class
            );
            if (!responseEntity.getStatusCode().is2xxSuccessful() || responseEntity.getBody() == null
                    || CollectionUtils.isEmpty(responseEntity.getBody().getOutput())) {
                return Collections.emptyList();
            }
            List<Map<String, Object>> results = new LinkedList<>();
            for (GreptimeSqlQueryContent.Output output : responseEntity.getBody().getOutput()) {
                if (output == null || output.getRecords() == null || CollectionUtils.isEmpty(output.getRecords().getRows())) {
                    continue;
                }
                GreptimeSqlQueryContent.Output.Records.Schema schema = output.getRecords().getSchema();
                List<GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema> columns =
                        schema == null ? Collections.emptyList() : schema.getColumnSchemas();
                for (List<Object> row : output.getRecords().getRows()) {
                    Map<String, Object> rowMap = new HashMap<>();
                    if (!CollectionUtils.isEmpty(columns)) {
                        for (int i = 0; i < Math.min(columns.size(), row.size()); i++) {
                            rowMap.put(columns.get(i).getName(), row.get(i));
                        }
                    } else {
                        for (int i = 0; i < row.size(); i++) {
                            rowMap.put("col_" + i, row.get(i));
                        }
                    }
                    results.add(rowMap);
                }
            }
            return results;
        } catch (Exception ex) {
            log.warn("Query trace rows fallback failed, sql={}, message={}", sql, ex.getMessage());
            return Collections.emptyList();
        }
    }

    private String escapeSql(String value) {
        return value == null ? "" : value.replace("'", "''");
    }
}
