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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

@ExtendWith(MockitoExtension.class)
class GreptimeLogPipelineInitializerTest {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private ObjectProvider<GreptimeProperties> greptimePropertiesProvider;

    @Mock
    private GreptimeProperties greptimeProperties;

    private GreptimeLogPipelineInitializer initializer;

    @BeforeEach
    void setUp() {
        initializer = new GreptimeLogPipelineInitializer(restTemplate, greptimePropertiesProvider);
    }

    @Test
    void uploadsBundledLogPipelineToGreptimeWhenEnabled() {
        configureGreptimeProperties(true);
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.GET),
                org.mockito.ArgumentMatchers.<HttpEntity<Void>>argThat(entity -> {
                    assertEquals("Basic "
                                    + Base64.getEncoder().encodeToString("demo:secret".getBytes(StandardCharsets.UTF_8)),
                            entity.getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
                    return true;
                }),
                eq(String.class)))
                .thenThrow(new HttpClientErrorException(HttpStatus.NOT_FOUND));
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<MultiValueMap<String, Object>>>argThat(entity -> {
                    assertEquals("Basic "
                                    + Base64.getEncoder().encodeToString("demo:secret".getBytes(StandardCharsets.UTF_8)),
                            entity.getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
                    assertNotNull(entity.getHeaders().getContentType());
                    assertEquals("multipart", entity.getHeaders().getContentType().getType());
                    assertEquals("form-data", entity.getHeaders().getContentType().getSubtype());

                    Object filePart = entity.getBody().getFirst("file");
                    assertTrue(filePart instanceof HttpEntity<?>);
                    Object fileBody = ((HttpEntity<?>) filePart).getBody();
                    assertNotNull(fileBody);
                    String pipeline = fileBody.toString();
                    assertTrue(pipeline.contains("hertzbeat_event_id"));
                    assertTrue(pipeline.contains("log_record_uid"));
                    assertTrue(pipeline.contains("hertzbeat_entity_id"));
                    assertTrue(pipeline.contains("- log_attributes\n      - resource_attributes\n    type: json"));
                    assertTrue(pipeline.contains("index: skipping"));
                    assertTrue(pipeline.contains("index: fulltext"));
                    return true;
                }),
                eq(String.class)))
                .thenReturn(new ResponseEntity<>("", HttpStatus.OK));

        initializer.initialize();

        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(String.class));
    }

    @Test
    void trimsAndNormalizesGreptimeEndpointBeforeQueryingAndUploadingPipeline() {
        configureGreptimeProperties(true, "  http://greptime:4000///  ");
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.GET),
                org.mockito.ArgumentMatchers.<HttpEntity<Void>>any(),
                eq(String.class)))
                .thenThrow(new HttpClientErrorException(HttpStatus.NOT_FOUND));
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<MultiValueMap<String, Object>>>any(),
                eq(String.class)))
                .thenReturn(new ResponseEntity<>("", HttpStatus.OK));

        initializer.initialize();

        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.GET),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(String.class));
        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(String.class));
    }

    @Test
    void trimsGreptimeBasicAuthCredentialsBeforeQueryingAndUploadingPipeline() {
        configureGreptimeProperties(true);
        when(greptimeProperties.username()).thenReturn(" demo ");
        when(greptimeProperties.password()).thenReturn(" secret ");
        String expectedAuthorization = "Basic "
                + Base64.getEncoder().encodeToString("demo:secret".getBytes(StandardCharsets.UTF_8));
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.GET),
                org.mockito.ArgumentMatchers.<HttpEntity<Void>>argThat(entity -> {
                    assertEquals(expectedAuthorization, entity.getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
                    return true;
                }),
                eq(String.class)))
                .thenThrow(new HttpClientErrorException(HttpStatus.NOT_FOUND));
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<MultiValueMap<String, Object>>>argThat(entity -> {
                    assertEquals(expectedAuthorization, entity.getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
                    return true;
                }),
                eq(String.class)))
                .thenReturn(new ResponseEntity<>("", HttpStatus.OK));

        initializer.initialize();

        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(String.class));
    }

    @Test
    void uploadsBundledPipelineWhenGreptimeQueryReturnsNullResponse() {
        configureGreptimeProperties(true);
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.GET),
                org.mockito.ArgumentMatchers.<HttpEntity<Void>>any(),
                eq(String.class)))
                .thenReturn(null);
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<MultiValueMap<String, Object>>>any(),
                eq(String.class)))
                .thenReturn(new ResponseEntity<>("", HttpStatus.OK));

        assertDoesNotThrow(() -> initializer.initialize());

        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(String.class));
    }

    @Test
    void doesNotFailStartupWhenGreptimeUploadReturnsNullResponseAfterRetryBudget() {
        configureGreptimeProperties(true);
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.GET),
                org.mockito.ArgumentMatchers.<HttpEntity<Void>>any(),
                eq(String.class)))
                .thenThrow(new HttpClientErrorException(HttpStatus.NOT_FOUND));
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<MultiValueMap<String, Object>>>any(),
                eq(String.class)))
                .thenReturn(null);

        assertDoesNotThrow(() -> initializer.initialize());

        verify(restTemplate, times(2)).exchange(
                eq("http://greptime:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(String.class));
    }

    @Test
    void doesNotFailStartupWhenGreptimeUploadThrowsUnexpectedRuntimeException() {
        configureGreptimeProperties(true);
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.GET),
                org.mockito.ArgumentMatchers.<HttpEntity<Void>>any(),
                eq(String.class)))
                .thenThrow(new HttpClientErrorException(HttpStatus.NOT_FOUND));
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<MultiValueMap<String, Object>>>any(),
                eq(String.class)))
                .thenThrow(new IllegalStateException("unexpected greptime client failure"));

        assertDoesNotThrow(() -> initializer.initialize());

        verify(restTemplate).exchange(
                eq("http://greptime:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(String.class));
    }

    @Test
    void retriesRetryablePipelineQueryStatusBeforeSkippingMatchingUpload() throws Exception {
        configureGreptimeProperties(true);
        String pipeline = bundledPipeline();
        String responseBody = OBJECT_MAPPER.writeValueAsString(
                java.util.Map.of("pipelines", java.util.List.of(java.util.Map.of("pipeline", pipeline))));
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.GET),
                org.mockito.ArgumentMatchers.<HttpEntity<Void>>any(),
                eq(String.class)))
                .thenReturn(new ResponseEntity<>("", HttpStatus.SERVICE_UNAVAILABLE))
                .thenReturn(new ResponseEntity<>(responseBody, HttpStatus.OK));

        initializer.initialize();

        verify(restTemplate, times(2)).exchange(
                eq("http://greptime:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.GET),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(String.class));
        verify(restTemplate, never()).exchange(
                eq("http://greptime:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(String.class));
    }

    @Test
    void retriesRetryablePipelineUploadStatusBeforeStartupCompletes() {
        configureGreptimeProperties(true);
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.GET),
                org.mockito.ArgumentMatchers.<HttpEntity<Void>>any(),
                eq(String.class)))
                .thenThrow(new HttpClientErrorException(HttpStatus.NOT_FOUND));
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<MultiValueMap<String, Object>>>any(),
                eq(String.class)))
                .thenReturn(new ResponseEntity<>("", HttpStatus.SERVICE_UNAVAILABLE))
                .thenReturn(new ResponseEntity<>("", HttpStatus.OK));

        initializer.initialize();

        verify(restTemplate, times(2)).exchange(
                eq("http://greptime:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(String.class));
    }

    @Test
    void skipsUploadWhenLatestGreptimePipelineAlreadyMatchesBundledResource() throws Exception {
        configureGreptimeProperties(true);
        String pipeline = bundledPipeline();
        String responseBody = OBJECT_MAPPER.writeValueAsString(
                java.util.Map.of("pipelines", java.util.List.of(java.util.Map.of("pipeline", pipeline))));
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.GET),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(String.class)))
                .thenReturn(new ResponseEntity<>(responseBody, HttpStatus.OK));

        initializer.initialize();

        verify(restTemplate, never()).exchange(
                eq("http://greptime:4000/v1/pipelines/hertzbeat_otlp_log_v1"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.any(HttpEntity.class),
                eq(String.class));
    }

    @Test
    void doesNotFailStartupWhenGreptimePropertiesLookupThrowsRuntimeException() {
        when(greptimePropertiesProvider.getIfAvailable())
                .thenThrow(new IllegalStateException("greptime properties unavailable"));

        assertDoesNotThrow(() -> initializer.initialize());

        verify(restTemplate, never()).exchange(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                eq(String.class));
    }

    @Test
    void skipsUploadWhenGreptimeIsDisabled() {
        configureGreptimeProperties(false);

        initializer.initialize();

        verify(restTemplate, never()).exchange(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                eq(String.class));
    }

    private void configureGreptimeProperties(boolean enabled) {
        configureGreptimeProperties(enabled, "http://greptime:4000");
    }

    private void configureGreptimeProperties(boolean enabled, String httpEndpoint) {
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(enabled);
        if (enabled) {
            when(greptimeProperties.httpEndpoint()).thenReturn(httpEndpoint);
            when(greptimeProperties.username()).thenReturn("demo");
            when(greptimeProperties.password()).thenReturn("secret");
        }
    }

    private String bundledPipeline() throws Exception {
        try (InputStream inputStream = Thread.currentThread().getContextClassLoader()
                .getResourceAsStream(GreptimeLogPipelineInitializer.LOG_PIPELINE_RESOURCE)) {
            assertNotNull(inputStream);
            return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
