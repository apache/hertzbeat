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

package org.apache.hertzbeat.mcp.server.service;

import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.ReadContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * Log query service
 */
@Service
@Slf4j
public class LogService {

    private static final String TIMESTAMP_COLUMN = "timestamp";
    private static final String SEVERITY_TEXT_COLUMN = "severity_text";
    private static final String BODY_COLUMN = "body";
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    
    private final RestClient restClient;

    public LogService(@Value("${greptime.url}") String greptimeUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(greptimeUrl)
                .defaultHeader("Accept", "application/json")
                .defaultHeader("Content-Type", "application/x-www-form-urlencoded")
                .build();
    }

    @Tool(description = "System log query tool that supports filtering by time, log level, and content")
    public String getHertzbeatLog(
            @ToolParam(description = """
                Query system logs with support for filtering by time, log level, and content.
                
                Usage:
                1. Table name: hzb_log
                2. Common query examples:
                   - Get latest 10 logs: SELECT * FROM hzb_log ORDER BY timestamp DESC LIMIT 10
                   - Query ERROR level logs: SELECT * FROM hzb_log WHERE severity_number=17
                   - Query specific time range: SELECT * FROM hzb_log WHERE timestamp > '2024-01-01 00:00:00'
                   - Query last ten minutes: SELECT * FROM hzb_log WHERE  timestamp >= now() - Interval '10m' AND timestamp < now()
                   - Query logs at or above the INFO level: SELECT * FROM hzb_log WHERE severity_number >= 9
                
                Field descriptions:
                1. severity_number (log level):
                   - 5: DEBUG
                   - 9: INFO
                   - 13: WARN
                   - 17: ERROR
                2. timestamp: log timestamp
                3. body: log content
                """) String querySql) {
        
        if (!isValidQuery(querySql)) {
            return "Invalid query statement";
        }

        try {
            String response = executeQuery(querySql);
            return formatQueryResults(response);
        } catch (Exception e) {
            log.error("Failed to query logs", e);
            return "Failed to query logs: " + e.getMessage();
        }
    }

    private boolean isValidQuery(String sql) {
        return sql != null && sql.toLowerCase().contains("hzb_log");
    }

    private String executeQuery(String sql) {
        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("sql", sql);
        log.debug("Executing SQL query: {}", sql);
        
        return restClient.post()
                .uri("/v1/sql?db=public")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(formData)
                .retrieve()
                .body(String.class);
    }

    private String formatQueryResults(String response) {
        ReadContext ctx = JsonPath.parse(response);
        List<Map<String, Object>> columnSchemas = ctx.read("$.output[0].records.schema.column_schemas");
        List<List<Object>> rows = ctx.read("$.output[0].records.rows");
        int totalRows = ctx.read("$.output[0].records.total_rows");

        ColumnIndices indices = findColumnIndices(columnSchemas);
        StringBuilder result = new StringBuilder()
                .append("Query Results:\n\n")
                .append("Log Time\t\t\tLog Level\tLog Content\n")
                .append("----------------------------------------------------\n");

        if (rows != null && !rows.isEmpty()) {
            formatRows(rows, indices, result);
            result.append("\nTotal ").append(totalRows).append(" records");
        } else {
            result.append("No data");
        }

        return result.toString();
    }

    private record ColumnIndices(int timestamp, int severityText, int body) {}

    private ColumnIndices findColumnIndices(List<Map<String, Object>> columnSchemas) {
        int timestampIndex = -1;
        int severityTextIndex = -1;
        int bodyIndex = -1;

        for (int i = 0; i < columnSchemas.size(); i++) {
            String columnName = (String) columnSchemas.get(i).get("name");
            switch (columnName) {
                case TIMESTAMP_COLUMN -> timestampIndex = i;
                case SEVERITY_TEXT_COLUMN -> severityTextIndex = i;
                case BODY_COLUMN -> bodyIndex = i;
                default -> {
                    // Ignore other columns
                }
            }
        }

        return new ColumnIndices(timestampIndex, severityTextIndex, bodyIndex);
    }

    private void formatRows(List<List<Object>> rows, ColumnIndices indices, StringBuilder result) {
        for (List<Object> row : rows) {
            appendTimestamp(row, indices.timestamp(), result);
            appendSeverity(row, indices.severityText(), result);
            appendBody(row, indices.body(), result);
            result.append("\n");
        }
    }

    private void appendTimestamp(List<Object> row, int index, StringBuilder result) {
        if (index >= 0 && index < row.size()) {
            Object value = row.get(index);
            if (value instanceof Number) {
                long timestamp = ((Number) value).longValue();
                LocalDateTime dateTime = LocalDateTime.ofInstant(
                        Instant.ofEpochMilli(timestamp / 1_000_000),
                        ZoneId.systemDefault());
                result.append(DATE_FORMATTER.format(dateTime)).append("\t");
                return;
            }
        }
        result.append("Unknown time\t");
    }

    private void appendSeverity(List<Object> row, int index, StringBuilder result) {
        if (index >= 0 && index < row.size()) {
            result.append(row.get(index)).append("\t");
        } else {
            result.append("Unknown\t");
        }
    }

    private void appendBody(List<Object> row, int index, StringBuilder result) {
        if (index >= 0 && index < row.size()) {
            result.append(row.get(index));
        } else {
            result.append("No content");
        }
    }
}
