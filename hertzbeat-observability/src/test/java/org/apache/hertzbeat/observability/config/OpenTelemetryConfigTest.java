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

import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
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
                GreptimeProperties.class
        );
        method.setAccessible(true);

        @SuppressWarnings("unchecked")
        Map<String, String> headers = (Map<String, String>) method.invoke(
                config,
                new GreptimeProperties(true, "127.0.0.1:4001", "http://127.0.0.1:4000",
                        "public", "greptime", "greptime", "1d")
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

    @SuppressWarnings("unchecked")
    private Map<String, String> greptimeHeaders(String methodName, GreptimeProperties properties) throws Exception {
        Method method = OpenTelemetryConfig.class.getDeclaredMethod(methodName, GreptimeProperties.class);
        method.setAccessible(true);
        return (Map<String, String>) method.invoke(new OpenTelemetryConfig(), properties);
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
}
