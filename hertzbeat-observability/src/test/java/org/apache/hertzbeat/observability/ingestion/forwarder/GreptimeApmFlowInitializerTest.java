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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.InputStream;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

@ExtendWith(MockitoExtension.class)
class GreptimeApmFlowInitializerTest {

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private ObjectProvider<GreptimeProperties> greptimePropertiesProvider;

    @Mock
    private GreptimeProperties greptimeProperties;

    private GreptimeApmFlowInitializer initializer;

    @BeforeEach
    void setUp() {
        initializer = new GreptimeApmFlowInitializer(restTemplate, greptimePropertiesProvider);
    }

    @Test
    void executesBundledApmFlowStatementsWhenGreptimeEnabled() {
        configureGreptimeProperties(true);
        when(restTemplate.exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                org.mockito.ArgumentMatchers.<HttpEntity<String>>any(),
                eq(String.class)))
                .thenReturn(ResponseEntity.ok("{}"));

        initializer.initialize();

        ArgumentCaptor<HttpEntity<String>> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate, times(2)).exchange(
                eq("http://greptime:4000/v1/sql?db=public"),
                eq(HttpMethod.POST),
                entityCaptor.capture(),
                eq(String.class));

        List<String> sqlStatements = entityCaptor.getAllValues().stream()
                .map(this::decodeSql)
                .toList();
        assertTrue(sqlStatements.get(0).contains("CREATE TABLE IF NOT EXISTS hertzbeat_apm_red_1m"));
        assertTrue(sqlStatements.get(1).contains("CREATE FLOW IF NOT EXISTS hertzbeat_apm_red_1m_flow"));
        assertTrue(sqlStatements.get(1).contains("SINK TO hertzbeat_apm_red_1m"));
        assertTrue(sqlStatements.get(1).contains("EXPIRE AFTER '6 hours'::INTERVAL"));

        for (HttpEntity<String> entity : entityCaptor.getAllValues()) {
            assertEquals(MediaType.APPLICATION_FORM_URLENCODED, entity.getHeaders().getContentType());
            assertEquals("Basic " + Base64.getEncoder()
                            .encodeToString("demo:secret".getBytes(StandardCharsets.UTF_8)),
                    entity.getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
        }
    }

    @Test
    void bundledApmFlowResourceUsesSafeGreptimeTraceRollupSemantics() throws Exception {
        String sql = bundledFlowSql();
        String lowerSql = sql.toLowerCase();

        assertTrue(sql.contains("CREATE TABLE IF NOT EXISTS hertzbeat_apm_red_1m"));
        assertTrue(sql.contains("CREATE FLOW IF NOT EXISTS hertzbeat_apm_red_1m_flow"));
        assertTrue(sql.contains("date_bin('1 minute'::INTERVAL, \"timestamp\") AS time_window"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"hertzbeat.workspace_id\"]')"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"hertzbeat.entity_id\"]')"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"deployment.environment\"]')"));
        assertTrue(sql.contains("json_get_string(resource_attributes, '$[\"service.namespace\"]')"));
        assertTrue(sql.contains("span_status_code = 'STATUS_CODE_ERROR'"));
        assertTrue(sql.contains("uddsketch_state(128, 0.01, duration_nano) AS duration_sketch"));
        assertTrue(sql.contains("span_kind IN ('SPAN_KIND_SERVER', 'SERVER', 'SPAN_KIND_CONSUMER', 'CONSUMER')"));
        assertTrue(sql.contains("PRIMARY KEY(service_name, operation, span_kind, workspace_id, entity_id, "
                + "deployment_environment, service_namespace)"));
        assertFalse(lowerSql.contains("drop flow"));
        assertFalse(lowerSql.contains("drop table"));
        assertFalse(lowerSql.contains("trace_id"));
        assertFalse(lowerSql.contains("span_id"));
    }

    @Test
    void skipsInitializationWhenGreptimeIsDisabled() {
        configureGreptimeProperties(false);

        initializer.initialize();

        verify(restTemplate, never()).exchange(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                eq(String.class));
    }

    private void configureGreptimeProperties(boolean enabled) {
        when(greptimePropertiesProvider.getIfAvailable()).thenReturn(greptimeProperties);
        when(greptimeProperties.enabled()).thenReturn(enabled);
        if (enabled) {
            when(greptimeProperties.httpEndpoint()).thenReturn("http://greptime:4000/");
            when(greptimeProperties.database()).thenReturn("public");
            when(greptimeProperties.username()).thenReturn("demo");
            when(greptimeProperties.password()).thenReturn("secret");
        }
    }

    private String decodeSql(HttpEntity<String> entity) {
        assertNotNull(entity.getBody());
        assertTrue(entity.getBody().startsWith("sql="));
        return URLDecoder.decode(entity.getBody().substring("sql=".length()), StandardCharsets.UTF_8);
    }

    private String bundledFlowSql() throws Exception {
        try (InputStream inputStream = Thread.currentThread().getContextClassLoader()
                .getResourceAsStream(GreptimeApmFlowInitializer.APM_FLOW_RESOURCE)) {
            assertNotNull(inputStream);
            return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
