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

package org.apache.hertzbeat.warehouse.db;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.NetworkConstants;
import org.apache.hertzbeat.common.constants.SignConstants;
import org.apache.hertzbeat.common.util.Base64Util;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeSqlQueryContent;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.MediaType;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriUtils;

/**
 * query executor for GreptimeDB SQL
 */
@Slf4j
@Component("greptimeSqlQueryExecutor")
@ConditionalOnProperty(prefix = "warehouse.store.greptime", name = "enabled", havingValue = "true")
public class GreptimeSqlQueryExecutor extends SqlQueryExecutor {

    private static final String QUERY_PATH = "/v1/sql";
    private static final String DATASOURCE = "Greptime-sql";

    private final GreptimeProperties greptimeProperties;


    public GreptimeSqlQueryExecutor(GreptimeProperties greptimeProperties, RestTemplate restTemplate) {
        super(restTemplate, new SqlQueryExecutor.HttpSqlProperties(sqlEndpoint(greptimeProperties.httpEndpoint()),
                trimmed(greptimeProperties.username()), trimmed(greptimeProperties.password())));
        this.greptimeProperties = greptimeProperties;
    }

    @Override
    public List<Map<String, Object>> execute(String queryString) {
        List<Map<String, Object>> results = new LinkedList<>();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        String username = trimmed(greptimeProperties.username());
        String password = trimmed(greptimeProperties.password());
        if (StringUtils.hasText(username) && StringUtils.hasText(password)) {
            String authStr = username + ":" + password;
            String encodedAuth = Base64Util.encode(authStr);
            headers.add(HttpHeaders.AUTHORIZATION, NetworkConstants.BASIC + SignConstants.BLANK + encodedAuth);
        }

        String requestBody = "sql=" + URLEncoder.encode(queryString, StandardCharsets.UTF_8);
        HttpEntity<String> httpEntity = new HttpEntity<>(requestBody, headers);

        String url = sqlEndpoint(greptimeProperties.httpEndpoint());
        String database = trimmed(greptimeProperties.database());
        if (StringUtils.hasText(database)) {
            url += "?db=" + UriUtils.encodeQueryParam(database, StandardCharsets.UTF_8);
        }

        ResponseEntity<GreptimeSqlQueryContent> responseEntity;
        try {
            responseEntity = restTemplate.exchange(url,
                    HttpMethod.POST, httpEntity, GreptimeSqlQueryContent.class);
        } catch (Exception e) {
            log.error("Exception occurred while querying GreptimeDB SQL: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to execute GreptimeDB SQL query", e);
        }

        if (responseEntity == null) {
            log.error("query metrics data from greptime failed. null response");
            return results;
        }

        if (responseEntity.getStatusCode().is2xxSuccessful()) {
            GreptimeSqlQueryContent responseBody = responseEntity.getBody();
            // GreptimeDB SQL HTTP API may not return 'code' field in successful response
            // Check if output exists and is not empty
            if (responseBody != null && responseBody.getOutput() != null && !responseBody.getOutput().isEmpty()) {

                for (GreptimeSqlQueryContent.Output output : responseBody.getOutput()) {
                    if (output != null && output.getRecords() != null && output.getRecords().getRows() != null) {
                        GreptimeSqlQueryContent.Output.Records.Schema schema = output.getRecords().getSchema();
                        List<List<Object>> rows = output.getRecords().getRows();

                        for (List<Object> row : rows) {
                            if (row == null) {
                                continue;
                            }
                            Map<String, Object> rowMap = new HashMap<>();
                            List<GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema> columnSchemas =
                                    schema == null ? null : schema.getColumnSchemas();
                            for (int i = 0; i < row.size(); i++) {
                                rowMap.put(columnName(columnSchemas, i), row.get(i));
                            }
                            results.add(rowMap);
                        }
                    }
                }
            }
        } else {
            log.error("query metrics data from greptime failed. {}", responseEntity);
        }
        return results;
    }

    @Override
    public String getDatasource() {
        return DATASOURCE;
    }

    private static String sqlEndpoint(String httpEndpoint) {
        String endpoint = stripTrailingSlashes(trimmed(httpEndpoint));
        return endpoint + QUERY_PATH;
    }

    private static String trimmed(String value) {
        return StringUtils.trimWhitespace(value);
    }

    private static String stripTrailingSlashes(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        int end = value.length();
        while (end > 0 && value.charAt(end - 1) == '/') {
            end--;
        }
        return value.substring(0, end);
    }

    private static String columnName(
            List<GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema> columnSchemas, int index) {
        if (columnSchemas == null || index >= columnSchemas.size()) {
            return "col_" + index;
        }
        GreptimeSqlQueryContent.Output.Records.Schema.ColumnSchema columnSchema = columnSchemas.get(index);
        if (columnSchema == null || !StringUtils.hasText(columnSchema.getName())) {
            return "col_" + index;
        }
        return columnSchema.getName();
    }
}
