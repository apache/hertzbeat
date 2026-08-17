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

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.apache.hertzbeat.warehouse.constants.WarehouseConstants;
import org.apache.hertzbeat.warehouse.service.OtlpSignalStorage;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

/** GreptimeDB storage implementation for validated OTLP protobuf requests. */
@Service
@ConditionalOnProperty(prefix = "warehouse.store.greptime", name = "enabled", havingValue = "true")
public class GreptimeOtlpSignalStorage implements OtlpSignalStorage {

    private static final MediaType PROTOBUF = MediaType.parseMediaType("application/x-protobuf");
    private static final String GREPTIME_DATABASE_HEADER = "X-Greptime-DB-Name";
    private static final String GREPTIME_TRACE_TABLE_HEADER = "X-Greptime-Trace-Table-Name";
    private static final String GREPTIME_PIPELINE_HEADER = "X-Greptime-Pipeline-Name";
    private static final String GREPTIME_LOG_TABLE_HEADER = "X-Greptime-Log-Table-Name";
    private static final String GREPTIME_LOG_PIPELINE_HEADER = "X-Greptime-Log-Pipeline-Name";
    private static final String GREPTIME_PROMOTE_RESOURCE_HEADER =
            "X-Greptime-OTLP-Metric-Promote-Resource-Attrs";
    private static final String PROMOTED_RESOURCE_ATTRIBUTES = String.join(";", List.of(
            "service.name", "service.namespace", "service.version", "deployment.environment.name",
            "host.name", "k8s.namespace.name", "k8s.pod.name"));
    private static final Set<String> SIGNALS = Set.of("metrics", "logs", "traces");

    private final GreptimeProperties greptimeProperties;
    private final RestTemplate restTemplate;

    public GreptimeOtlpSignalStorage(GreptimeProperties greptimeProperties,
                                     @Qualifier(WarehouseConstants.GREPTIME_WRITE_REST_TEMPLATE)
                                     RestTemplate restTemplate) {
        this.greptimeProperties = greptimeProperties;
        this.restTemplate = restTemplate;
    }

    @Override
    public byte[] writeProtobuf(String signal, byte[] content) {
        String normalizedSignal = normalizeSignal(signal);
        HttpHeaders headers = greptimeHeaders(normalizedSignal);
        ResponseEntity<byte[]> response;
        try {
            response = restTemplate.exchange(
                    endpoint(greptimeProperties.httpEndpoint(), "/v1/otlp/v1/" + normalizedSignal),
                    HttpMethod.POST,
                    new HttpEntity<>(content == null ? new byte[0] : content, headers),
                    byte[].class);
        } catch (HttpClientErrorException exception) {
            // A 4xx from GreptimeDB means the payload itself was rejected: surface it as a client error
            // instead of a retryable storage failure so exporters stop retrying a request that can never succeed.
            throw new IllegalArgumentException(rejectionMessage(normalizedSignal, exception), exception);
        }
        // 5xx and transport failures propagate as RestClientException and keep their retryable semantics.
        return response.getBody() == null ? new byte[0] : response.getBody();
    }

    private static String rejectionMessage(String signal, HttpClientErrorException exception) {
        String detail = exception.getResponseBodyAsString(StandardCharsets.UTF_8);
        if (!StringUtils.hasText(detail)) {
            detail = exception.getStatusText();
        }
        return "GreptimeDB rejected OTLP " + signal + " (" + exception.getStatusCode().value() + "): "
                + detail.strip();
    }

    private HttpHeaders greptimeHeaders(String signal) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(PROTOBUF);
        headers.setAccept(List.of(PROTOBUF));
        headers.set(GREPTIME_DATABASE_HEADER, StringUtils.hasText(greptimeProperties.database())
                ? greptimeProperties.database() : "public");
        if ("metrics".equals(signal)) {
            headers.set(GREPTIME_PROMOTE_RESOURCE_HEADER, PROMOTED_RESOURCE_ATTRIBUTES);
        } else if ("traces".equals(signal)) {
            headers.set(GREPTIME_TRACE_TABLE_HEADER, WarehouseConstants.TRACE_TABLE_NAME);
            headers.set(GREPTIME_PIPELINE_HEADER, "greptime_trace_v1");
        } else {
            headers.set(GREPTIME_LOG_TABLE_HEADER, WarehouseConstants.LOG_TABLE_NAME);
            headers.set(GREPTIME_LOG_PIPELINE_HEADER, "hertzbeat_otlp_log_v1");
        }
        if (StringUtils.hasText(greptimeProperties.username())
                && StringUtils.hasText(greptimeProperties.password())) {
            headers.setBasicAuth(greptimeProperties.username(), greptimeProperties.password(),
                    StandardCharsets.UTF_8);
        }
        return headers;
    }

    private String normalizeSignal(String signal) {
        String normalized = StringUtils.hasText(signal) ? signal.toLowerCase(Locale.ROOT) : "";
        if (!SIGNALS.contains(normalized)) {
            throw new IllegalArgumentException("Unsupported OTLP signal");
        }
        return normalized;
    }

    private String endpoint(String base, String path) {
        return StringUtils.trimTrailingCharacter(base, '/') + path;
    }
}
