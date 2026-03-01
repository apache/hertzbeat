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

package org.apache.hertzbeat.warehouse.store.history.tsdb.doris;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.binary.Base64;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.http.Header;
import org.apache.http.HttpEntityEnclosingRequest;
import org.apache.http.HttpRequest;
import org.apache.http.HttpResponse;
import org.apache.http.HttpHeaders;
import org.apache.http.protocol.HttpContext;
import org.apache.http.ProtocolException;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpPut;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.DefaultRedirectStrategy;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.impl.conn.PoolingHttpClientConnectionManager;
import org.apache.http.util.EntityUtils;
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.client.utils.URIBuilder;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Doris Stream Load writer using Apache HttpClient for high-throughput writes.
 * Based on official Apache Doris Stream Load Java example.
 * <p>
 * Reference: <a href="https://github.com/apache/doris/blob/master/samples/doris-stream-load-demo/src/main/java/DorisStreamLoad.java">...</a>
 */
@Slf4j
public class DorisStreamLoadWriter {

    private static final int CONNECT_TIMEOUT = 30000;
    private static final int SOCKET_TIMEOUT = 60000;
    private static final int CONNECTION_REQUEST_TIMEOUT = 5000;
    private static final int MAX_TOTAL_CONNECTIONS = 20;
    private static final int MAX_PER_ROUTE_CONNECTIONS = 10;
    private static final long RETRY_BACKOFF_MS = 200L;
    private static final DateTimeFormatter DORIS_DATETIME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");
    private static final String METRIC_JSON_PATHS =
            "[\"$.instance\",\"$.app\",\"$.metrics\",\"$.metric\",\"$.recordTime\",\"$.metricType\",\"$.int32Value\",\"$.doubleValue\",\"$.strValue\",\"$.labels\"]";
    private static final String METRIC_COLUMNS =
            "instance,app,metrics,metric,record_time,metric_type,int32_value,double_value,str_value,labels";
    private static final String LOG_JSON_PATHS =
            "[\"$.timeUnixNano\",\"$.observedTimeUnixNano\",\"$.eventTime\",\"$.severityNumber\",\"$.severityText\""
                    + ",\"$.body\",\"$.traceId\",\"$.spanId\",\"$.traceFlags\",\"$.attributes\",\"$.resource\""
                    + ",\"$.instrumentationScope\",\"$.droppedAttributesCount\"]";
    private static final String LOG_COLUMNS =
            "time_unix_nano,observed_time_unix_nano,event_time,severity_number,severity_text,body,trace_id,span_id,trace_flags,attributes,resource,instrumentation_scope,dropped_attributes_count";

    public static final String STATUS_SUCCESS = "Success";
    public static final String STATUS_PUBLISH_TIMEOUT = "Publish Timeout";
    public static final String STATUS_FAIL = "Fail";
    public static final String STATUS_LABEL_ALREADY_EXISTS = "Label Already Exists";

    private final String databaseName;
    private final String tableName;
    private final String feHost;
    private final int feHttpPort;
    private final String username;
    private final String password;
    private final DorisProperties.StreamLoadConfig config;

    private final AtomicLong transactionId = new AtomicLong(0);
    private final CloseableHttpClient httpClient;

    private enum LoadResult {
        SUCCESS,
        RETRYABLE_FAILURE,
        NON_RETRYABLE_FAILURE
    }

    private static final class StreamLoadMetricRow {
        public String instance;
        public String app;
        public String metrics;
        public String metric;
        public String recordTime;
        public Byte metricType;
        public Integer int32Value;
        public Double doubleValue;
        public String strValue;
        public String labels;
    }

    private static final class StreamLoadLogRow {
        public Long timeUnixNano;
        public Long observedTimeUnixNano;
        public String eventTime;
        public Integer severityNumber;
        public String severityText;
        public String body;
        public String traceId;
        public String spanId;
        public Integer traceFlags;
        public String attributes;
        public String resource;
        public String instrumentationScope;
        public Integer droppedAttributesCount;
    }

    /**
     * -- GETTER --
     * Check if writer is available
     */
    @Getter
    private volatile boolean available = true;

    public DorisStreamLoadWriter(String databaseName, String tableName,
                                  String jdbcUrl, String username, String password,
                                  DorisProperties.StreamLoadConfig config) {
        this.databaseName = databaseName;
        this.tableName = tableName;
        this.username = username;
        this.password = password;
        this.config = config;

        this.feHost = parseHostFromJdbcUrl(jdbcUrl);
        this.feHttpPort = parseHttpPort(config.httpPort());

        // Create HTTP client with connection pool and redirect support
        this.httpClient = createHttpClient();

        log.info("[Doris StreamLoad] Writer initialized for {}.{}", databaseName, tableName);
    }

    private String parseHostFromJdbcUrl(String jdbcUrl) {
        if (jdbcUrl == null || jdbcUrl.isBlank()) {
            return "127.0.0.1";
        }

        String hostPart = jdbcUrl;
        if (hostPart.startsWith("jdbc:mysql://")) {
            hostPart = hostPart.substring("jdbc:mysql://".length());
        }

        int slashIndex = hostPart.indexOf('/');
        if (slashIndex > 0) {
            hostPart = hostPart.substring(0, slashIndex);
        }

        int queryIndex = hostPart.indexOf('?');
        if (queryIndex > 0) {
            hostPart = hostPart.substring(0, queryIndex);
        }

        // Multi-host URL: use first host
        int commaIndex = hostPart.indexOf(',');
        if (commaIndex > 0) {
            hostPart = hostPart.substring(0, commaIndex);
        }

        int colonIndex = hostPart.lastIndexOf(':');
        if (colonIndex > 0) {
            hostPart = hostPart.substring(0, colonIndex);
        }

        return hostPart;
    }

    private int parseHttpPort(String portStr) {
        if (portStr == null || portStr.isBlank()) {
            return 8030;
        }
        if (portStr.startsWith(":")) {
            portStr = portStr.substring(1);
        }
        try {
            return Integer.parseInt(portStr);
        } catch (NumberFormatException e) {
            return 8030; // default
        }
    }

    /**
     * Create HTTP client with connection pool and automatic redirect handling
     * Replaces internal IPs in redirect URLs with external FE host for cloud deployments
     */
    private CloseableHttpClient createHttpClient() {
        // Connection pool configuration
        PoolingHttpClientConnectionManager connectionManager = new PoolingHttpClientConnectionManager();
        connectionManager.setMaxTotal(MAX_TOTAL_CONNECTIONS);
        connectionManager.setDefaultMaxPerRoute(MAX_PER_ROUTE_CONNECTIONS);

        // Request configuration
        RequestConfig requestConfig = RequestConfig.custom()
                .setConnectTimeout(CONNECT_TIMEOUT)
                .setSocketTimeout(SOCKET_TIMEOUT)
                .setConnectionRequestTimeout(CONNECTION_REQUEST_TIMEOUT)
                .build();

        // Custom redirect strategy to handle PUT requests and replace internal IPs
        DefaultRedirectStrategy redirectStrategy = new DefaultRedirectStrategy() {
            @Override
            protected boolean isRedirectable(String method) {
                // Enable redirect for PUT method (required for Doris Stream Load)
                return true;
            }

            @Override
            public HttpUriRequest getRedirect(
                    HttpRequest request,
                    HttpResponse response,
                    HttpContext context) throws ProtocolException {
                URI uri = getLocationURI(request, response, context);
                String redirectLocation = uri.toString();

                // Check if redirect points to localhost/internal IP
                String host = uri.getHost();
                if (host != null && ("127.0.0.1".equals(host) || "localhost".equals(host)
                        || host.startsWith("192.168.") || host.startsWith("10.")
                        || "0.0.0.0".equals(host))) {
                    // Replace internal IP with external FE host, keep BE port and path
                    int port = uri.getPort() > 0 ? uri.getPort() : 8040;
                    String path = uri.getPath();
                    String query = uri.getQuery();
                    redirectLocation = "http://" + feHost + ":" + port + path
                            + (query != null ? "?" + query : "");
                    log.debug("[Doris StreamLoad] Replaced internal IP {} with external {}:{}",
                            host, feHost, port);
                    try {
                        uri = new URI(redirectLocation);
                    } catch (URISyntaxException e) {
                        log.warn("[Doris StreamLoad] Failed to build URI for redirect location", e);
                    }
                }

                // Remove any embedded credentials like http://root:@
                if (redirectLocation.contains("@")) {
                    try {
                        URIBuilder uriBuilder = new URIBuilder(redirectLocation);
                        uriBuilder.setUserInfo(null);
                        uri = uriBuilder.build();
                    } catch (URISyntaxException e) {
                        log.warn("[Doris StreamLoad] Failed to remove credentials from redirect URL", e);
                    }
                }

                // Create new redirect request
                HttpPut redirect = new HttpPut(uri);
                if (request instanceof HttpEntityEnclosingRequest sourceRequest
                        && sourceRequest.getEntity() != null) {
                    redirect.setEntity(sourceRequest.getEntity());
                }
                // Copy headers from original request
                copyHeaders(request, redirect);

                return redirect;
            }

            private void copyHeaders(HttpRequest source, HttpUriRequest target) {
                // Keep all business headers for redirected PUT request.
                for (Header header : source.getAllHeaders()) {
                    String name = header.getName();
                    if (HttpHeaders.CONTENT_LENGTH.equalsIgnoreCase(name)
                            || HttpHeaders.HOST.equalsIgnoreCase(name)
                            || HttpHeaders.TRANSFER_ENCODING.equalsIgnoreCase(name)) {
                        continue;
                    }
                    target.setHeader(name, header.getValue());
                }
            }
        };

        return HttpClients.custom()
                .setConnectionManager(connectionManager)
                .setDefaultRequestConfig(requestConfig)
                .setRedirectStrategy(redirectStrategy)
                .build();
    }

    /**
     * Build Basic Authentication header
     */
    private String basicAuthHeader(String username, String password) {
        String toBeEncode = username + ":" + (password != null ? password : "");
        byte[] encoded = Base64.encodeBase64(toBeEncode.getBytes(StandardCharsets.UTF_8));
        return "Basic " + new String(encoded, StandardCharsets.UTF_8);
    }

    /**
     * Build unique label for idempotency
     */
    private String buildLabel() {
        return "hzb_" + System.currentTimeMillis() + "_" + transactionId.incrementAndGet();
    }

    /**
     * Build Stream Load URL
     */
    private String buildLoadUrl() {
        return String.format("http://%s:%d/api/%s/%s/_stream_load",
                feHost, feHttpPort, databaseName, tableName);
    }

    /**
     * Write metrics data using Stream Load API
     *
     * @param rows list of metric rows to write
     * @return true if write succeeded, false otherwise
     */
    public boolean write(List<DorisMetricRow> rows) {
        if (!available || rows == null || rows.isEmpty()) {
            return false;
        }

        return writeMetricWithAutoSplit(new ArrayList<>(rows));
    }

    public boolean writeLogs(List<LogEntry> logEntries) {
        if (!available || logEntries == null || logEntries.isEmpty()) {
            return false;
        }
        return writeLogWithAutoSplit(new ArrayList<>(logEntries));
    }

    private boolean writeMetricWithAutoSplit(List<DorisMetricRow> rows) {
        List<StreamLoadMetricRow> streamLoadRows = toStreamLoadRows(rows);
        String jsonData = JsonUtil.toJson(streamLoadRows);
        if (jsonData == null) {
            log.error("[Doris StreamLoad] Failed to serialize {} rows to JSON.", rows.size());
            return false;
        }

        int payloadBytes = jsonData.getBytes(StandardCharsets.UTF_8).length;
        int maxBytesPerBatch = config.maxBytesPerBatch();
        if (payloadBytes > maxBytesPerBatch && rows.size() > 1) {
            int mid = rows.size() / 2;
            List<DorisMetricRow> left = new ArrayList<>(rows.subList(0, mid));
            List<DorisMetricRow> right = new ArrayList<>(rows.subList(mid, rows.size()));
            log.debug("[Doris StreamLoad] Split batch: rows={}, bytes={}, maxBytes={}",
                    rows.size(), payloadBytes, maxBytesPerBatch);
            return writeMetricWithAutoSplit(left) && writeMetricWithAutoSplit(right);
        }

        String label = buildLabel();
        return writeSingleBatch(rows.size(), jsonData, label, METRIC_JSON_PATHS, METRIC_COLUMNS);
    }

    private boolean writeLogWithAutoSplit(List<LogEntry> logEntries) {
        List<StreamLoadLogRow> streamLoadRows = toStreamLoadLogRows(logEntries);
        String jsonData = JsonUtil.toJson(streamLoadRows);
        if (jsonData == null) {
            log.error("[Doris StreamLoad] Failed to serialize {} log entries to JSON.", logEntries.size());
            return false;
        }

        int payloadBytes = jsonData.getBytes(StandardCharsets.UTF_8).length;
        int maxBytesPerBatch = config.maxBytesPerBatch();
        if (payloadBytes > maxBytesPerBatch && logEntries.size() > 1) {
            int mid = logEntries.size() / 2;
            List<LogEntry> left = new ArrayList<>(logEntries.subList(0, mid));
            List<LogEntry> right = new ArrayList<>(logEntries.subList(mid, logEntries.size()));
            log.debug("[Doris StreamLoad] Split log batch: rows={}, bytes={}, maxBytes={}",
                    logEntries.size(), payloadBytes, maxBytesPerBatch);
            return writeLogWithAutoSplit(left) && writeLogWithAutoSplit(right);
        }

        String label = buildLabel();
        return writeSingleBatch(logEntries.size(), jsonData, label, LOG_JSON_PATHS, LOG_COLUMNS);
    }

    private List<StreamLoadMetricRow> toStreamLoadRows(List<DorisMetricRow> rows) {
        List<StreamLoadMetricRow> result = new ArrayList<>(rows.size());
        for (DorisMetricRow row : rows) {
            StreamLoadMetricRow item = new StreamLoadMetricRow();
            item.instance = row.instance;
            item.app = row.app;
            item.metrics = row.metrics;
            item.metric = row.metric;
            item.recordTime = formatRecordTime(row.recordTime);
            item.metricType = row.metricType;
            item.int32Value = row.int32Value;
            item.doubleValue = row.doubleValue;
            item.strValue = row.strValue;
            item.labels = row.labels;
            result.add(item);
        }
        return result;
    }

    private String formatRecordTime(Timestamp timestamp) {
        if (timestamp == null) {
            return null;
        }
        return DORIS_DATETIME_FORMATTER.format(timestamp.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime());
    }

    private List<StreamLoadLogRow> toStreamLoadLogRows(List<LogEntry> logEntries) {
        List<StreamLoadLogRow> result = new ArrayList<>(logEntries.size());
        for (LogEntry logEntry : logEntries) {
            long timeUnixNano = logEntry.getTimeUnixNano() != null
                    ? logEntry.getTimeUnixNano()
                    : System.currentTimeMillis() * 1_000_000L;
            long observedTimeUnixNano = logEntry.getObservedTimeUnixNano() != null
                    ? logEntry.getObservedTimeUnixNano()
                    : timeUnixNano;

            StreamLoadLogRow row = new StreamLoadLogRow();
            row.timeUnixNano = timeUnixNano;
            row.observedTimeUnixNano = observedTimeUnixNano;
            row.eventTime = formatEpochNanos(timeUnixNano);
            row.severityNumber = logEntry.getSeverityNumber();
            row.severityText = logEntry.getSeverityText();
            row.body = JsonUtil.toJson(logEntry.getBody());
            row.traceId = logEntry.getTraceId();
            row.spanId = logEntry.getSpanId();
            row.traceFlags = logEntry.getTraceFlags();
            row.attributes = JsonUtil.toJson(logEntry.getAttributes());
            row.resource = JsonUtil.toJson(logEntry.getResource());
            row.instrumentationScope = JsonUtil.toJson(logEntry.getInstrumentationScope());
            row.droppedAttributesCount = logEntry.getDroppedAttributesCount();
            result.add(row);
        }
        return result;
    }

    private String formatEpochNanos(long epochNanos) {
        long millis = epochNanos / 1_000_000L;
        return DORIS_DATETIME_FORMATTER.format(
                Instant.ofEpochMilli(millis).atZone(ZoneId.systemDefault()).toLocalDateTime());
    }

    private boolean writeSingleBatch(int rowCount, String jsonData, String label,
                                     String jsonPaths, String columns) {
        String loadUrl = buildLoadUrl();
        int maxAttempts = Math.max(1, config.retryTimes() + 1);

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            LoadResult loadResult;
            String responseBody = "";
            int statusCode = -1;
            String action = String.format("label=%s attempt=%d/%d rows=%d",
                    label, attempt, maxAttempts, rowCount);

            HttpPut httpPut = new HttpPut(loadUrl);
            httpPut.setHeader(HttpHeaders.EXPECT, "100-continue");
            httpPut.setHeader(HttpHeaders.AUTHORIZATION, basicAuthHeader(username, password));
            httpPut.setHeader("label", label);
            httpPut.setHeader("format", "json");
            httpPut.setHeader("strip_outer_array", "true");
            httpPut.setHeader("timeout", String.valueOf(config.timeout()));
            httpPut.setHeader("max_filter_ratio", String.valueOf(config.maxFilterRatio()));
            httpPut.setHeader("strict_mode", String.valueOf(config.strictMode()));
            httpPut.setHeader("jsonpaths", jsonPaths);
            httpPut.setHeader("columns", columns);
            setHeaderIfHasText(httpPut, "timezone", config.timezone());
            setHeaderIfHasText(httpPut, "redirect-policy", config.redirectPolicy());
            setHeaderIfHasText(httpPut, "group_commit", config.groupCommit());
            if (config.sendBatchParallelism() > 0) {
                httpPut.setHeader("send_batch_parallelism", String.valueOf(config.sendBatchParallelism()));
            }
            httpPut.setEntity(new StringEntity(jsonData, StandardCharsets.UTF_8));

            try (CloseableHttpResponse response = httpClient.execute(httpPut)) {
                statusCode = response.getStatusLine().getStatusCode();
                if (response.getEntity() != null) {
                    responseBody = EntityUtils.toString(response.getEntity());
                }
                loadResult = handleResponse(statusCode, responseBody, rowCount);
            } catch (Exception e) {
                log.warn("[Doris StreamLoad] Request error, {}: {}", action, e.getMessage());
                loadResult = LoadResult.RETRYABLE_FAILURE;
            }

            if (loadResult == LoadResult.SUCCESS) {
                return true;
            }

            if (loadResult == LoadResult.NON_RETRYABLE_FAILURE || attempt >= maxAttempts) {
                log.error("[Doris StreamLoad] Batch failed, {} statusCode={} response={}",
                        action, statusCode, responseBody);
                return false;
            }

            try {
                Thread.sleep(RETRY_BACKOFF_MS * attempt);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.warn("[Doris StreamLoad] Retry interrupted, {}", action);
                return false;
            }
        }
        return false;
    }

    private void setHeaderIfHasText(HttpPut httpPut, String name, String value) {
        if (value != null && !value.isBlank()) {
            httpPut.setHeader(name, value.trim());
        }
    }

    /**
     * Handle Stream Load response
     *
     * Note: statusCode 200 only indicates the BE service is OK, not that stream load succeeded.
     * We must parse the response JSON to check the actual status.
     */
    private LoadResult handleResponse(int statusCode, String body, int rowCount) {
        if (statusCode != 200) {
            log.warn("[Doris StreamLoad] HTTP request returned status {}, response: {}",
                    statusCode, body);
            return statusCode >= 500 ? LoadResult.RETRYABLE_FAILURE : LoadResult.NON_RETRYABLE_FAILURE;
        }

        JsonNode jsonNode = JsonUtil.fromJson(body);
        if (jsonNode == null || !jsonNode.has("Status")) {
            log.error("[Doris StreamLoad] Invalid response body: {}", body);
            return LoadResult.NON_RETRYABLE_FAILURE;
        }

        String status = jsonNode.get("Status").asText("");

        if (STATUS_SUCCESS.equalsIgnoreCase(status)) {
            log.info("[Doris StreamLoad] Successfully loaded {} rows", rowCount);
            return LoadResult.SUCCESS;
        }

        if (STATUS_PUBLISH_TIMEOUT.equalsIgnoreCase(status)) {
            log.warn("[Doris StreamLoad] Publish Timeout for {} rows, treated as success. Response: {}",
                    rowCount, body);
            return LoadResult.SUCCESS;
        }

        if (STATUS_LABEL_ALREADY_EXISTS.equalsIgnoreCase(status)) {
            String existingStatus = jsonNode.has("ExistingJobStatus")
                    ? jsonNode.get("ExistingJobStatus").asText("")
                    : "";
            if ("FINISHED".equalsIgnoreCase(existingStatus) || "VISIBLE".equalsIgnoreCase(existingStatus)) {
                log.info("[Doris StreamLoad] Label exists and already finished for {} rows", rowCount);
                return LoadResult.SUCCESS;
            }

            return LoadResult.RETRYABLE_FAILURE;
        }

        if (STATUS_FAIL.equalsIgnoreCase(status)) {
            log.error("[Doris StreamLoad] Failed to load {} rows, status={}, response={}",
                    rowCount, status, body);
            return LoadResult.NON_RETRYABLE_FAILURE;
        }

        log.warn("[Doris StreamLoad] Unexpected status={} for {} rows, response={}",
                status, rowCount, body);
        return LoadResult.RETRYABLE_FAILURE;
    }

    /**
     * Get current statistics
     */
    public String getStats() {
        return String.format("transactions=%d, available=%s", transactionId.get(), available);
    }

    /**
     * Close the HTTP client and release resources
     */
    public void close() {
        available = false;
        try {
            if (httpClient != null) {
                httpClient.close();
                log.info("[Doris StreamLoad] HTTP client closed");
            }
        } catch (IOException e) {
            log.error("[Doris StreamLoad] Failed to close HTTP client", e);
        }
    }
}
