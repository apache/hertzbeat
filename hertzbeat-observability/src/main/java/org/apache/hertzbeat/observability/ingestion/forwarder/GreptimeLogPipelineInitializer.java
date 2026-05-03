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

package org.apache.hertzbeat.observability.ingestion.forwarder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

/**
 * Uploads the bundled Greptime log pipeline used by native OTLP log ingestion.
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "warehouse.store.greptime", name = "enabled", havingValue = "true")
public class GreptimeLogPipelineInitializer {

    public static final String LOG_PIPELINE_RESOURCE = "greptime/pipelines/hertzbeat_otlp_log_v1.yaml";

    private static final String LOG_PIPELINE_PATH = "/v1/pipelines/" + GreptimeOtlpForwarder.LOG_PIPELINE_NAME;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final RestTemplate restTemplate;
    private final ObjectProvider<GreptimeProperties> greptimePropertiesProvider;

    public GreptimeLogPipelineInitializer(RestTemplate restTemplate,
                                          ObjectProvider<GreptimeProperties> greptimePropertiesProvider) {
        this.restTemplate = restTemplate;
        this.greptimePropertiesProvider = greptimePropertiesProvider;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void initialize() {
        GreptimeProperties greptimeProperties = greptimePropertiesProvider.getIfAvailable();
        if (greptimeProperties == null || !greptimeProperties.enabled()
                || StringUtils.isBlank(greptimeProperties.httpEndpoint())) {
            log.debug("[observability greptime-log] skip pipeline upload because Greptime is disabled.");
            return;
        }
        try {
            String pipeline = readPipelineResource();
            if (latestPipelineMatches(greptimeProperties, pipeline)) {
                log.info("[observability greptime-log] Greptime log pipeline {} is already current.",
                        GreptimeOtlpForwarder.LOG_PIPELINE_NAME);
                return;
            }
            ResponseEntity<String> response = restTemplate.exchange(
                    endpoint(greptimeProperties.httpEndpoint()),
                    HttpMethod.POST,
                    pipelineUploadRequest(greptimeProperties, pipeline),
                    String.class
            );
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("[observability greptime-log] uploaded Greptime log pipeline {}.",
                        GreptimeOtlpForwarder.LOG_PIPELINE_NAME);
                return;
            }
            log.warn("[observability greptime-log] failed to upload Greptime log pipeline {}, status {}.",
                    GreptimeOtlpForwarder.LOG_PIPELINE_NAME, response.getStatusCode());
        } catch (IOException | RestClientException ex) {
            log.warn("[observability greptime-log] failed to upload Greptime log pipeline {}: {}",
                    GreptimeOtlpForwarder.LOG_PIPELINE_NAME, ex.getMessage(), ex);
        }
    }

    private boolean latestPipelineMatches(GreptimeProperties greptimeProperties, String bundledPipeline) {
        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    endpoint(greptimeProperties.httpEndpoint()),
                    HttpMethod.GET,
                    new HttpEntity<Void>(headers(greptimeProperties)),
                    String.class
            );
            if (!response.getStatusCode().is2xxSuccessful() || StringUtils.isBlank(response.getBody())) {
                return false;
            }
            JsonNode pipelines = OBJECT_MAPPER.readTree(response.getBody()).path("pipelines");
            if (!pipelines.isArray() || pipelines.isEmpty()) {
                return false;
            }
            String latestPipeline = pipelines.get(0).path("pipeline").asText();
            return normalizePipeline(latestPipeline).equals(normalizePipeline(bundledPipeline));
        } catch (HttpClientErrorException ex) {
            if (ex.getStatusCode() == HttpStatus.NOT_FOUND) {
                return false;
            }
            log.warn("[observability greptime-log] failed to query Greptime log pipeline {}: {}",
                    GreptimeOtlpForwarder.LOG_PIPELINE_NAME, ex.getMessage());
            return false;
        } catch (IOException | RestClientException ex) {
            log.warn("[observability greptime-log] failed to query Greptime log pipeline {}: {}",
                    GreptimeOtlpForwarder.LOG_PIPELINE_NAME, ex.getMessage());
            return false;
        }
    }

    private HttpEntity<MultiValueMap<String, Object>> pipelineUploadRequest(GreptimeProperties greptimeProperties,
                                                                            String pipeline) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        addAuthenticationHeader(headers, greptimeProperties);

        HttpHeaders partHeaders = new HttpHeaders();
        partHeaders.setContentType(MediaType.parseMediaType("application/x-yaml"));
        partHeaders.setContentDisposition(ContentDisposition.formData()
                .name("file")
                .filename("hertzbeat_otlp_log_v1.yaml")
                .build());

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new HttpEntity<>(pipeline, partHeaders));
        return new HttpEntity<>(body, headers);
    }

    private HttpHeaders headers(GreptimeProperties greptimeProperties) {
        HttpHeaders headers = new HttpHeaders();
        addAuthenticationHeader(headers, greptimeProperties);
        return headers;
    }

    private String readPipelineResource() throws IOException {
        ClassPathResource resource = new ClassPathResource(LOG_PIPELINE_RESOURCE);
        return resource.getContentAsString(StandardCharsets.UTF_8);
    }

    private String normalizePipeline(String pipeline) {
        return StringUtils.defaultString(pipeline)
                .replace("\r\n", "\n")
                .strip();
    }

    private void addAuthenticationHeader(HttpHeaders headers, GreptimeProperties greptimeProperties) {
        if (StringUtils.isBlank(greptimeProperties.username()) || StringUtils.isBlank(greptimeProperties.password())) {
            return;
        }
        headers.setBasicAuth(greptimeProperties.username(), greptimeProperties.password(), StandardCharsets.UTF_8);
    }

    private String endpoint(String baseEndpoint) {
        return StringUtils.removeEnd(baseEndpoint, "/") + LOG_PIPELINE_PATH;
    }
}
