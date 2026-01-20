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
import org.apache.hertzbeat.common.util.JsonUtil;
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

    private final String databaseName;
    private final String tableName;
    private final String feHost;
    private final int feHttpPort;
    private final String username;
    private final String password;
    private final DorisProperties.StreamLoadConfig config;

    private final AtomicLong transactionId = new AtomicLong(0);
    private final CloseableHttpClient httpClient;

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

        // Extract host from JDBC URL (jdbc:mysql://host:port/...)
        String hostPart = jdbcUrl.substring("jdbc:mysql://".length());

        // Remove database/path part if exists
        int slashIndex = hostPart.indexOf('/');
        if (slashIndex > 0) {
            hostPart = hostPart.substring(0, slashIndex);
        }

        // Remove MySQL port (9030) if present, keep only host
        int colonIndex = hostPart.indexOf(':');
        if (colonIndex > 0) {
            hostPart = hostPart.substring(0, colonIndex);
        }

        this.feHost = hostPart;
        this.feHttpPort = parseHttpPort(config.httpPort());

        // Create HTTP client with connection pool and redirect support
        this.httpClient = createHttpClient();

        log.info("[Doris StreamLoad] Writer initialized for {}.{}", databaseName, tableName);
    }

    private int parseHttpPort(String portStr) {
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
                String method = request.getRequestLine().getMethod();
                HttpUriRequest redirect = new HttpPut(uri);
                // Copy headers from original request
                copyHeaders(request, redirect);

                return redirect;
            }

            private void copyHeaders(HttpRequest source, HttpUriRequest target) {
                // Copy all essential headers
                String[] headersToCopy = {
                        HttpHeaders.AUTHORIZATION,
                        HttpHeaders.EXPECT,
                        "label",
                        "max_filter_ratio",
                        "format",
                        "read_json_by_line",
                        "strip_outer_array",
                        "timeout",
                        "jsonpaths",
                        "columns"
                };
                for (String header : headersToCopy) {
                    if (source.getFirstHeader(header) != null) {
                        target.setHeader(header, source.getFirstHeader(header).getValue());
                    }
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
        return "Basic " + new String(encoded);
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

        HttpPut httpPut = null;
        CloseableHttpResponse response = null;
        try {
            String label = buildLabel();
            String jsonData = JsonUtil.toJson(rows);

            log.debug("[Doris StreamLoad] Sending {} rows with label: {}", rows.size(), label);

            // Build the Stream Load URL
            String loadUrl = buildLoadUrl();

            // Create HTTP PUT request
            httpPut = new HttpPut(loadUrl);
            httpPut.setHeader(HttpHeaders.EXPECT, "100-continue");
            httpPut.setHeader(HttpHeaders.AUTHORIZATION, basicAuthHeader(username, password));
            httpPut.setHeader("label", label);
            httpPut.setHeader("max_filter_ratio", "0.1");
            httpPut.setHeader("format", "json");
            httpPut.setHeader("read_json_by_line", "true");
            httpPut.setHeader("strip_outer_array", "true");
            httpPut.setHeader("timeout", String.valueOf(config.timeout()));

            // Map JSON fields to table columns using jsonpaths and columns
            // JSON fields: instance, app, metrics, metric, metricType, int32Value, doubleValue, strValue, recordTime, labels
            // Table columns: instance, app, metrics, metric, record_time, metric_type, int32_value, double_value, str_value, labels
            httpPut.setHeader("jsonpaths",
                    "[\"$.instance\",\"$.app\",\"$.metrics\",\"$.metric\",\"$.recordTime\",\"$.metricType\",\"$.int32Value\",\"$.doubleValue\",\"$.strValue\",\"$.labels\"]");
            httpPut.setHeader("columns",
                    "instance,app,metrics,metric,record_time,metric_type,int32_value,double_value,str_value,labels");

            // Set request body
            StringEntity entity = new StringEntity(jsonData, "UTF-8");
            httpPut.setEntity(entity);

            // Execute request (HttpClient will automatically follow 307 redirect)
            response = httpClient.execute(httpPut);

            // Parse response
            String loadResult = "";
            if (response.getEntity() != null) {
                loadResult = EntityUtils.toString(response.getEntity());
            }

            int statusCode = response.getStatusLine().getStatusCode();

            return handleResponse(statusCode, loadResult, rows.size());

        } catch (Exception e) {
            log.error("[Doris StreamLoad] Failed to write {} rows: {}", rows.size(), e.getMessage(), e);
            return false;
        } finally {
            // Close response
            if (response != null) {
                try {
                    response.close();
                } catch (IOException e) {
                    log.warn("[Doris StreamLoad] Failed to close response", e);
                }
            }
        }
    }

    /**
     * Handle Stream Load response
     *
     * Note: statusCode 200 only indicates the BE service is OK, not that stream load succeeded.
     * We must parse the response JSON to check the actual status.
     */
    private boolean handleResponse(int statusCode, String body, int rowCount) {
        if (statusCode != 200) {
            log.error("[Doris StreamLoad] HTTP request failed with status {}. Response: {}",
                    statusCode, body);
            return false;
        }

        // Parse JSON response to check actual Stream Load status
        JsonNode jsonNode = JsonUtil.fromJson(body);
        if (jsonNode == null) {
            log.error("[Doris StreamLoad] Failed to parse response JSON: {}", body);
            return false;
        }

        if (!jsonNode.has("Status")) {
            log.error("[Doris StreamLoad] Response missing Status field: {}", body);
            return false;
        }

        String status = jsonNode.get("Status").asText();

        if ("Success".equals(status)) {
            log.info("[Doris StreamLoad] Successfully loaded {} rows", rowCount);
            return true;
        }

        // Check for partial success - data may still be loaded
        if ("Publish Timeout".equals(status)) {
            log.warn("[Doris StreamLoad] Publish Timeout for {} rows, data may be loaded. Response: {}",
                    rowCount, body);
            return true;
        }

        // Label already exists - could be a retry, treat as success if previous load finished
        if ("Label Already Exists".equals(status)) {
            if (jsonNode.has("ExistingJobStatus")) {
                String existingStatus = jsonNode.get("ExistingJobStatus").asText();
                if ("FINISHED".equals(existingStatus) || "VISIBLE".equals(existingStatus)) {
                    log.info("[Doris StreamLoad] Label already exists and finished, {} rows loaded", rowCount);
                    return true;
                }
            }
            log.warn("[Doris StreamLoad] Label already exists but not finished. Response: {}", body);
            return false;
        }

        // Other failure cases
        log.error("[Doris StreamLoad] Failed to load {} rows. Status: {}, Response: {}",
                rowCount, status, body);
        return false;
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
