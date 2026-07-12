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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.method.MethodToolCallbackProvider;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.test.web.client.MockRestServiceServer;

/**
 * Security tests for {@link LogService} queries.
 */
class LogServiceTest {

    private static final String BASE_QUERY = "SELECT timestamp, severity_text, body FROM hzb_logs";

    @Test
    void shouldBuildDefaultReadOnlyQuery() {
        assertThat(LogService.buildQuery(null, null, null, null, null))
                .isEqualTo(BASE_QUERY + " ORDER BY timestamp DESC LIMIT 20");
    }

    @Test
    void shouldExposeOnlyStructuredToolParameters() {
        LogService service = new LogService(
                RestClient.builder(), "http://localhost:4000", "public", "", "");
        ToolCallback[] callbacks = MethodToolCallbackProvider.builder().toolObjects(service).build().getToolCallbacks();

        assertThat(callbacks).singleElement().satisfies(callback -> {
            assertThat(callback.getToolDefinition().name()).isEqualTo("query_logs");
            assertThat(callback.getToolDefinition().inputSchema())
                    .contains("severity", "keyword", "startTime", "endTime", "limit")
                    .doesNotContain("querySql");
        });
    }

    @Test
    void shouldBuildQueryFromValidatedFilters() {
        String query = LogService.buildQuery(
                " error ", " x'); DELETE FROM hzb_logs; -- ", 1L, 2L, 10);

        assertThat(query).isEqualTo(BASE_QUERY
                + " WHERE timestamp >= 1000000"
                + " AND timestamp <= 2000000"
                + " AND severity_text = 'ERROR'"
                + " AND matches_term(body, 'x''); DELETE FROM hzb_logs; --')"
                + " ORDER BY timestamp DESC LIMIT 10");
    }

    @Test
    void shouldRejectInvalidFilters() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> LogService.buildQuery("NOTICE", null, null, null, null));
        assertThatIllegalArgumentException()
                .isThrownBy(() -> LogService.buildQuery(null, null, -1L, null, null));
        assertThatIllegalArgumentException()
                .isThrownBy(() -> LogService.buildQuery(null, null, null, -1L, null));
        assertThatIllegalArgumentException()
                .isThrownBy(() -> LogService.buildQuery(null, null, 2L, 1L, null));
        assertThatIllegalArgumentException()
                .isThrownBy(() -> LogService.buildQuery(null, null, Long.MAX_VALUE, null, null));
        assertThatIllegalArgumentException()
                .isThrownBy(() -> LogService.buildQuery(null, "x".repeat(257), null, null, null));
        assertThatIllegalArgumentException()
                .isThrownBy(() -> LogService.buildQuery(null, null, null, null, 0));
        assertThatIllegalArgumentException()
                .isThrownBy(() -> LogService.buildQuery(null, null, null, null, 101));
    }

    @Test
    void shouldSendGeneratedSelectWithBasicAuthentication() {
        RestClient.Builder restClientBuilder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restClientBuilder).build();
        LogService service = new LogService(
                restClientBuilder, "http://localhost:4000", "observability", "reader", "secret");
        String query = BASE_QUERY + " ORDER BY timestamp DESC LIMIT 20";
        MultiValueMap<String, String> expectedForm = new LinkedMultiValueMap<>();
        expectedForm.setAll(Map.of("sql", query));
        String credentials = Base64.getEncoder()
                .encodeToString("reader:secret".getBytes(StandardCharsets.UTF_8));

        server.expect(requestTo("http://localhost:4000/v1/sql?db=observability"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Basic " + credentials))
                .andExpect(content().formData(expectedForm))
                .andRespond(withSuccess(emptyResult(), MediaType.APPLICATION_JSON));

        assertThat(service.queryLogs(null, null, null, null, null)).contains("No data");
        server.verify();
    }

    @Test
    void shouldFormatReturnedLogs() {
        RestClient.Builder restClientBuilder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restClientBuilder).build();
        LogService service = new LogService(restClientBuilder, "http://localhost:4000", "public", "", "");
        server.expect(requestTo("http://localhost:4000/v1/sql?db=public"))
                .andRespond(withSuccess(resultWithOneLog(), MediaType.APPLICATION_JSON));

        assertThat(service.queryLogs("ERROR", "failure", null, null, 1))
                .contains("ERROR", "failure", "Total 1 records");
        server.verify();
    }

    @Test
    void shouldReturnSafeErrorMessages() {
        RestClient.Builder restClientBuilder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restClientBuilder).build();
        LogService service = new LogService(restClientBuilder, "http://localhost:4000", "public", "", "");

        assertThat(service.queryLogs("NOTICE", null, null, null, null))
                .isEqualTo("查询参数无效：日志级别不受支持");

        server.expect(requestTo("http://localhost:4000/v1/sql?db=public"))
                .andRespond(withServerError());
        assertThat(service.queryLogs(null, null, null, null, null)).isEqualTo("日志查询失败");
        server.verify();
    }

    @Test
    void shouldRequireCompleteCredentials() {
        assertThatIllegalArgumentException().isThrownBy(() -> new LogService(
                RestClient.builder(), "http://localhost:4000", "public", "reader", ""));
        assertThatIllegalArgumentException().isThrownBy(() -> new LogService(
                RestClient.builder(), "http://localhost:4000", "public", "", "secret"));
    }

    @Test
    void shouldCreateWithProductionConstructor() {
        assertThat(new LogService("http://localhost:4000", "public", "", "")).isNotNull();
    }

    private static String emptyResult() {
        return """
                {
                  "output": [{
                    "records": {
                      "schema": {"column_schemas": [
                        {"name": "timestamp"},
                        {"name": "severity_text"},
                        {"name": "body"}
                      ]},
                      "rows": [],
                      "total_rows": 0
                    }
                  }]
                }
                """;
    }

    private static String resultWithOneLog() {
        return """
                {
                  "output": [{
                    "records": {
                      "schema": {"column_schemas": [
                        {"name": "timestamp"},
                        {"name": "severity_text"},
                        {"name": "body"}
                      ]},
                      "rows": [[0, "ERROR", "failure"]],
                      "total_rows": 1
                    }
                  }]
                }
                """;
    }
}
