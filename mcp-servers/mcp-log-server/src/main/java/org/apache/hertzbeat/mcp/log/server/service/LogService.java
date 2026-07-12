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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Log query service.
 */
@Service
@Slf4j
public class LogService {

    private static final String BASE_QUERY = "SELECT timestamp, severity_text, body FROM hzb_logs";
    private static final String TIMESTAMP_COLUMN = "timestamp";
    private static final String SEVERITY_TEXT_COLUMN = "severity_text";
    private static final String BODY_COLUMN = "body";
    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 100;
    private static final int MAX_KEYWORD_LENGTH = 256;
    private static final long NANOS_PER_MILLISECOND = 1_000_000L;
    private static final Set<String> SUPPORTED_SEVERITIES =
            Set.of("TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final RestClient restClient;
    private final String database;

    /**
     * Creates a log query service.
     *
     * @param greptimeUrl GreptimeDB URL
     * @param database GreptimeDB database name
     * @param username GreptimeDB username
     * @param password GreptimeDB password
     */
    @Autowired
    public LogService(@Value("${greptime.url}") String greptimeUrl,
                      @Value("${greptime.database:public}") String database,
                      @Value("${greptime.username:}") String username,
                      @Value("${greptime.password:}") String password) {
        this(RestClient.builder(), greptimeUrl, database, username, password);
    }

    LogService(RestClient.Builder restClientBuilder, String greptimeUrl, String database,
               String username, String password) {
        boolean hasUsername = username != null && !username.isBlank();
        boolean hasPassword = password != null && !password.isBlank();
        if (hasUsername != hasPassword) {
            throw new IllegalArgumentException("GreptimeDB username and password must be configured together");
        }

        RestClient.Builder builder = restClientBuilder
                .baseUrl(greptimeUrl)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_FORM_URLENCODED_VALUE);
        if (hasUsername) {
            builder.defaultHeaders(headers -> headers.setBasicAuth(username, password));
        }
        this.restClient = builder.build();
        this.database = database == null || database.isBlank() ? "public" : database;
    }

    /**
     * Queries HertzBeat system logs using structured filters.
     *
     * @param severity log severity
     * @param keyword log body keyword
     * @param startTime start time as a Unix timestamp in milliseconds
     * @param endTime end time as a Unix timestamp in milliseconds
     * @param limit maximum number of records to return
     * @return formatted log query results
     */
    @Tool(name = "query_logs", description = "Query HertzBeat system logs with structured read-only filters")
    public String queryLogs(
            @ToolParam(required = false,
                    description = "Log severity; supported values: TRACE, DEBUG, INFO, WARN, ERROR, FATAL")
            String severity,
            @ToolParam(required = false, description = "Keyword to search in the log body; maximum 256 characters")
            String keyword,
            @ToolParam(required = false, description = "Start time as a Unix timestamp in milliseconds")
            Long startTime,
            @ToolParam(required = false, description = "End time as a Unix timestamp in milliseconds")
            Long endTime,
            @ToolParam(required = false,
                    description = "Maximum number of records to return; defaults to 20 and cannot exceed 100")
            Integer limit) {
        try {
            String response = executeQuery(buildQuery(severity, keyword, startTime, endTime, limit));
            return formatQueryResults(response);
        } catch (IllegalArgumentException e) {
            return "Invalid query parameters: " + e.getMessage();
        } catch (Exception e) {
            log.error("Failed to query logs", e);
            return "Failed to query logs";
        }
    }

    static String buildQuery(String severity, String keyword, Long startTime, Long endTime, Integer limit) {
        if (startTime != null && startTime < 0) {
            throw new IllegalArgumentException("Start time must not be negative");
        }
        if (endTime != null && endTime < 0) {
            throw new IllegalArgumentException("End time must not be negative");
        }
        if (startTime != null && endTime != null && startTime > endTime) {
            throw new IllegalArgumentException("Start time must not be later than end time");
        }

        int queryLimit = limit == null ? DEFAULT_LIMIT : limit;
        if (queryLimit < 1 || queryLimit > MAX_LIMIT) {
            throw new IllegalArgumentException("Limit must be between 1 and 100");
        }

        List<String> conditions = new ArrayList<>(4);
        if (startTime != null) {
            conditions.add("timestamp >= " + toNanoseconds(startTime, "Start time"));
        }
        if (endTime != null) {
            conditions.add("timestamp <= " + toNanoseconds(endTime, "End time"));
        }

        String normalizedSeverity = normalizeSeverity(severity);
        if (normalizedSeverity != null) {
            conditions.add("severity_text = '" + normalizedSeverity + "'");
        }

        if (keyword != null && !keyword.isBlank()) {
            String normalizedKeyword = keyword.strip();
            if (normalizedKeyword.length() > MAX_KEYWORD_LENGTH) {
                throw new IllegalArgumentException("Log keyword must not exceed 256 characters");
            }
            conditions.add("matches_term(body, '" + escapeSqlLiteral(normalizedKeyword) + "')");
        }

        StringBuilder query = new StringBuilder(BASE_QUERY);
        if (!conditions.isEmpty()) {
            query.append(" WHERE ").append(String.join(" AND ", conditions));
        }
        return query.append(" ORDER BY timestamp DESC LIMIT ").append(queryLimit).toString();
    }

    private static String normalizeSeverity(String severity) {
        if (severity == null || severity.isBlank()) {
            return null;
        }
        String normalizedSeverity = severity.strip().toUpperCase(Locale.ROOT);
        if (!SUPPORTED_SEVERITIES.contains(normalizedSeverity)) {
            throw new IllegalArgumentException("Unsupported log severity");
        }
        return normalizedSeverity;
    }

    private static long toNanoseconds(long epochMilliseconds, String fieldName) {
        try {
            return Math.multiplyExact(epochMilliseconds, NANOS_PER_MILLISECOND);
        } catch (ArithmeticException e) {
            throw new IllegalArgumentException(fieldName + " is out of the supported range", e);
        }
    }

    private static String escapeSqlLiteral(String value) {
        return value.replace("'", "''");
    }

    private String executeQuery(String sql) {
        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("sql", sql);
        log.debug("Executing structured log query");

        return restClient.post()
                .uri(uriBuilder -> uriBuilder.path("/v1/sql").queryParam("db", database).build())
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
