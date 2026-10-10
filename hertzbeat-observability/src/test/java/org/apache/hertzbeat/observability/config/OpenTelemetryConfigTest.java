/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import io.opentelemetry.api.common.AttributeKey;
import io.opentelemetry.sdk.autoconfigure.spi.AutoConfigurationCustomizer;
import io.opentelemetry.sdk.autoconfigure.spi.ConfigProperties;
import io.opentelemetry.sdk.resources.Resource;

import java.lang.reflect.Method;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.function.BiFunction;
import java.util.function.Function;
import org.apache.hertzbeat.common.observability.gateway.SelfTelemetryProperties;
import org.mockito.ArgumentCaptor;
import org.apache.hertzbeat.observability.ingestion.forwarder.GreptimeOtlpForwarder;
import org.apache.hertzbeat.warehouse.constants.WarehouseConstants;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.junit.jupiter.api.Test;

class OpenTelemetryConfigTest {

    @Test
    void greptimeLogExporterUsesNativeWarehouseLogTable() throws Exception {
        OpenTelemetryConfig config = new OpenTelemetryConfig();
        Method method = OpenTelemetryConfig.class.getDeclaredMethod(
                "buildGreptimeOtlpLogHeaders",
                GreptimeProperties.class, SelfTelemetryProperties.class
        );
        method.setAccessible(true);

        @SuppressWarnings("unchecked")
        Map<String, String> headers = (Map<String, String>) method.invoke(
                config,
                new GreptimeProperties(true, "127.0.0.1:4001", "http://127.0.0.1:4000",
                        "public", "greptime", "greptime", "1d"), new SelfTelemetryProperties()
        );

        assertEquals(WarehouseConstants.LOG_TABLE_NAME, headers.get("X-Greptime-Log-Table-Name"));
        assertEquals(GreptimeOtlpForwarder.LOG_PIPELINE_NAME, headers.get("X-Greptime-Log-Pipeline-Name"));
    }

    @Test
    void greptimeSdkLogAndTraceExportersUseConfiguredDatabaseHeader() throws Exception {
        GreptimeProperties properties = new GreptimeProperties(true, "127.0.0.1:4001",
                "http://127.0.0.1:4000", " observability ", "greptime", "greptime", "1d");

        Map<String, String> logHeaders = greptimeHeaders("buildGreptimeOtlpLogHeaders", properties);
        Map<String, String> traceHeaders = greptimeHeaders("buildGreptimeOtlpTraceHeaders", properties);

        assertEquals("observability", logHeaders.get("X-Greptime-DB-Name"));
        assertEquals("observability", traceHeaders.get("X-Greptime-DB-Name"));
        assertEquals("hzb_traces", traceHeaders.get("X-Greptime-Trace-Table-Name"));
        assertEquals("greptime_trace_v1", traceHeaders.get("X-Greptime-Pipeline-Name"));
    }

    @Test
    void greptimeSdkLogAndTraceExportersNormalizeConfiguredEndpoint() throws Exception {
        GreptimeProperties properties = new GreptimeProperties(true, "127.0.0.1:4001",
                "  http://greptime:4000///  ", "public", "greptime", "greptime", "1d");

        assertEquals("http://greptime:4000/v1/otlp/v1/logs",
                greptimeEndpoint(properties, "/v1/otlp/v1/logs"));
        assertEquals("http://greptime:4000/v1/otlp/v1/traces",
                greptimeEndpoint(properties, "/v1/otlp/v1/traces"));
    }

    @Test
    void greptimeSdkLogAndTraceExportersTrimBasicAuthCredentials() throws Exception {
        GreptimeProperties properties = new GreptimeProperties(true, "127.0.0.1:4001",
                "http://127.0.0.1:4000", "public", " greptime ", " secret ", "1d");
        String expectedAuthorization = "Basic "
                + Base64.getEncoder().encodeToString("greptime:secret".getBytes(StandardCharsets.UTF_8));

        assertEquals(expectedAuthorization,
                greptimeHeaders("buildGreptimeOtlpLogHeaders", properties).get("Authorization"));
        assertEquals(expectedAuthorization,
                greptimeHeaders("buildGreptimeOtlpTraceHeaders", properties).get("Authorization"));
    }

    @Test
    void traceIngressUsesOnlyBearerAuthenticationWhenExplicitlyEnabled() throws Exception {
        OpenTelemetryConfig config = new OpenTelemetryConfig();
        OtelTraceIngressProperties ingress = new OtelTraceIngressProperties();
        ingress.setEnabled(true);
        ingress.setEndpoint(URI.create("http://127.0.0.1:1161/api/otlp/v1/traces"));
        ingress.setToken("intake-token");
        GreptimeProperties greptime = new GreptimeProperties(true, "127.0.0.1:4001",
                "http://127.0.0.1:4000", "public", "greptime", "greptime", "1d");

        assertEquals("http://127.0.0.1:1161/api/otlp/v1/traces",
                traceEndpoint(config, greptime, ingress));
        Map<String, String> headers = traceHeaders(config, greptime, ingress);
        assertEquals(Map.of("Authorization", "Bearer intake-token"), headers);
        assertFalse(headers.keySet().stream().anyMatch(header -> header.startsWith("X-Greptime-")));
    }

    @Test
    void traceIngressDisabledKeepsTheExistingGreptimeDestinationAndHeaders() throws Exception {
        OpenTelemetryConfig config = new OpenTelemetryConfig();
        OtelTraceIngressProperties ingress = new OtelTraceIngressProperties();
        GreptimeProperties greptime = new GreptimeProperties(true, "127.0.0.1:4001",
                "http://127.0.0.1:4000", "observability", "greptime", "greptime", "1d");

        assertEquals("http://127.0.0.1:4000/v1/otlp/v1/traces",
                traceEndpoint(config, greptime, ingress));
        Map<String, String> headers = traceHeaders(config, greptime, ingress);
        assertEquals("observability", headers.get("X-Greptime-DB-Name"));
        assertEquals("hzb_traces", headers.get("X-Greptime-Trace-Table-Name"));
        assertEquals("greptime_trace_v1", headers.get("X-Greptime-Pipeline-Name"));
    }

    @Test
    void enabledSelfUsesDistinctDatabaseAndExplicitWorkspaceResource() throws Exception {
        GreptimeProperties greptime = new GreptimeProperties(true, "127.0.0.1:4001",
                "http://127.0.0.1:4000", " external ", " user ", " secret ", "1d");
        SelfTelemetryProperties self = configuredSelf();
        self.markReady();
        String expectedAuthorization = "Basic "
                + Base64.getEncoder().encodeToString("user:secret".getBytes(StandardCharsets.UTF_8));
        for (String method : new String[]{"buildGreptimeOtlpLogHeaders", "buildGreptimeOtlpTraceHeaders"}) {
            Map<String, String> headers = greptimeHeaders(method, greptime, self);
            assertEquals("hertzbeat_self", headers.get("X-Greptime-DB-Name"));
            assertEquals(expectedAuthorization, headers.get("Authorization"));
        }
        AutoConfigurationCustomizer customizer = mock(AutoConfigurationCustomizer.class, org.mockito.Answers.RETURNS_SELF);
        new OpenTelemetryConfig().greptimeOtelCustomizer(greptime, new OtelTraceIngressProperties(),
                null, null, self, null).customize(customizer);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<BiFunction<Resource, ConfigProperties, Resource>> resourceCustomizer =
                ArgumentCaptor.forClass(BiFunction.class);
        verify(customizer).addResourceCustomizer(resourceCustomizer.capture());
        Resource resource = resourceCustomizer.getValue().apply(Resource.empty(), null);
        assertEquals("workspace-one", resource.getAttribute(AttributeKey.stringKey("hertzbeat.workspace_id")));
    }

    @Test
    void unreadySelfDisablesExportersWithoutInstallingExternalFallback() {
        assertNoFallback(configuredSelf(), new OtelTraceIngressProperties());
    }

    @Test
    void selfIngressConflictIsUnavailableWithoutInstallingExternalFallback() {
        SelfTelemetryProperties self = configuredSelf();
        self.markReady();
        OtelTraceIngressProperties ingress = new OtelTraceIngressProperties();
        ingress.setEnabled(true);
        assertNoFallback(self, ingress);
        assertFalse(self.isReady());
        assertEquals("TRACE_INGRESS_CONFLICT", self.getStatusReason());
    }

    private void assertNoFallback(SelfTelemetryProperties self, OtelTraceIngressProperties ingress) {
        AutoConfigurationCustomizer customizer = mock(AutoConfigurationCustomizer.class, org.mockito.Answers.RETURNS_SELF);
        GreptimeProperties greptime = new GreptimeProperties(true, "127.0.0.1:4001",
                "http://127.0.0.1:4000", "external", null, null, "1d");
        new OpenTelemetryConfig().greptimeOtelCustomizer(greptime, ingress, null, null, self, null).customize(customizer);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Function<ConfigProperties, Map<String, String>>> propertiesCustomizer =
                ArgumentCaptor.forClass(Function.class);
        verify(customizer).addPropertiesCustomizer(propertiesCustomizer.capture());
        assertEquals(Map.of("otel.traces.exporter", "none", "otel.logs.exporter", "none"),
                propertiesCustomizer.getValue().apply(null));
        verify(customizer, never()).addSpanExporterCustomizer(any());
        verify(customizer, never()).addLoggerProviderCustomizer(any());
        verify(customizer, never()).addResourceCustomizer(any());
    }

    private SelfTelemetryProperties configuredSelf() {
        SelfTelemetryProperties self = new SelfTelemetryProperties();
        self.setEnabled(true);
        self.setDatabase("hertzbeat_self");
        self.setWorkspaceId("workspace-one");
        return self;
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> greptimeHeaders(String methodName, GreptimeProperties properties) throws Exception {
        return greptimeHeaders(methodName, properties, new SelfTelemetryProperties());
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> greptimeHeaders(String methodName, GreptimeProperties properties,
            SelfTelemetryProperties self) throws Exception {
        Method method = OpenTelemetryConfig.class.getDeclaredMethod(methodName, GreptimeProperties.class,
                SelfTelemetryProperties.class);
        method.setAccessible(true);
        return (Map<String, String>) method.invoke(new OpenTelemetryConfig(), properties, self);
    }

    private String greptimeEndpoint(GreptimeProperties properties, String path) throws Exception {
        Method method = OpenTelemetryConfig.class.getDeclaredMethod(
                "greptimeOtlpEndpoint",
                GreptimeProperties.class,
                String.class
        );
        method.setAccessible(true);
        return (String) method.invoke(new OpenTelemetryConfig(), properties, path);
    }

    private String traceEndpoint(OpenTelemetryConfig config, GreptimeProperties greptime,
                                 OtelTraceIngressProperties ingress) throws Exception {
        Method method = OpenTelemetryConfig.class.getDeclaredMethod(
                "traceEndpoint", GreptimeProperties.class, OtelTraceIngressProperties.class);
        method.setAccessible(true);
        return (String) method.invoke(config, greptime, ingress);
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> traceHeaders(OpenTelemetryConfig config, GreptimeProperties greptime,
                                             OtelTraceIngressProperties ingress) throws Exception {
        Method method = OpenTelemetryConfig.class.getDeclaredMethod(
                "traceHeaders", GreptimeProperties.class, OtelTraceIngressProperties.class, SelfTelemetryProperties.class);
        method.setAccessible(true);
        return (Map<String, String>) method.invoke(config, greptime, ingress, new SelfTelemetryProperties());
    }
}
