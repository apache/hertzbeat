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

package org.apache.hertzbeat.manager.support;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.util.List;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.dto.log.LogFacets;
import org.apache.hertzbeat.common.observability.dto.log.LogSearchQuery;
import org.apache.hertzbeat.observability.logs.query.LogSearchParser;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.observability.investigation.service.LogInvestigationReadModelService;
import org.apache.hertzbeat.observability.logs.controller.LogQueryController;
import org.apache.hertzbeat.observability.logs.controller.LogSseController;
import org.apache.hertzbeat.observability.logs.query.LogFilterQueryException;
import org.apache.hertzbeat.observability.logs.service.impl.LogQueryServiceImpl;
import org.apache.hertzbeat.observability.logs.service.impl.LogSseServiceImpl;
import org.apache.hertzbeat.observability.logs.sse.LogSseManager;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionException;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class LogFilterHttpContractTest {
    private final HistoryDataReader reader = mock(HistoryDataReader.class);
    private final LogSseManager emitters = mock(LogSseManager.class);
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        AuthTokenRequestContext.bindAuthenticatedWorkspaceId("default");
        AuthTokenRequestContext.bindWorkspaceId("default");
        var admission = new ObservabilityQueryAdmissionService(8, 8, 8, 4, 8, Duration.ofMillis(100));
        var controller = new LogQueryController(new LogQueryServiceImpl(List.of(reader)), admission,
                mock(LogInvestigationReadModelService.class));
        mvc = MockMvcBuilders.standaloneSetup(controller, new LogSseController(new LogSseServiceImpl(emitters, List.of(), admission)))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @AfterEach
    void cleanUp() {
        AuthTokenRequestContext.clear();
    }

    @Test
    void facetLookupEchoesWhitespaceOnEmptyEntityAndOmitsEmptyLookup() throws Exception {
        for (String syntax : List.of("", "structured-v1")) {
            var request = get("/api/logs/facets/values").param("start", "1000").param("end", "5000")
                    .param("entityId", "7").param("field", "attribute:x").param("valueSearch", " Rare ");
            if (!syntax.isEmpty()) { request.param("searchSyntax", syntax); }
            mvc.perform(request).andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.search.query").value(" Rare "))
                    .andExpect(jsonPath("$.data.search.matchedCount").value(0))
                    .andExpect(jsonPath("$.data.matchedCount").value(0));
        }
        mvc.perform(get("/api/logs/facets/values").param("start", "1000").param("end", "5000")
                        .param("entityId", "7").param("field", "attribute:x").param("valueSearch", ""))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.search").doesNotExist());
        verifyNoInteractions(reader, emitters);
    }

    @Test
    void facetLookupInvalidBeforeMissingEntityRead() throws Exception {
        mvc.perform(get("/api/logs/facets/values").param("start", "1000").param("end", "5000")
                        .param("entityId", "7").param("field", "attribute:x").param("valueSearch", "x".repeat(257)))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(reader, emitters);
    }

    @Test
    void malformedNumericRangeHasSameHistoryAndLiveError() throws Exception {
        for (String endpoint : List.of("list", "stats/overview", "stats/trace-coverage", "stats/trend",
                "stats/group-by", "facets/fields", "facets/values", "analysis", "context")) {
            mvc.perform(get("/api/logs/" + endpoint).param("start", "1000").param("end", "5000")
                            .param("logRecordUid", "record-1").param("entityId", "7")
                            .param("groupBy", "service.name").param("field", "builtin:severityCategory")
                            .param("logNumericRange", "{}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.msg").value(LogFilterQueryException.ERROR_CODE));
        }
        for (String endpoint : List.of("validate", "subscribe")) {
            mvc.perform(get("/api/logs/sse/" + endpoint).param("logNumericRange", "{}")
                            .accept(endpoint.equals("subscribe") ? "text/event-stream" : "application/json"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.msg").value(LogFilterQueryException.ERROR_CODE));
        }
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/logs/analysis/compare")
                        .contentType("application/json").content("""
                        {"version":1,"parameters":{"start":"1000","end":"5000","logNumericRange":"{}"},
                         "queries":[{"id":"a","search":""},{"id":"b","search":""}]}
                        """))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(reader, emitters);
    }

    @Test
    void structuredDiagnosticsReachEveryHistoryAndLiveBoundary() throws Exception {
        for (String endpoint : List.of("list", "stats/overview", "stats/trace-coverage", "stats/trend", "stats/group-by",
                "facets/fields", "facets/values", "analysis")) {
            mvc.perform(get("/api/logs/" + endpoint).param("start", "1000").param("end", "2000")
                            .param("field", "attribute:x").param("groupBy", "severity")
                            .param("searchSyntax", "structured-v1").param("search", "service:"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.msg").value(LogFilterQueryException.ERROR_CODE))
                    .andExpect(jsonPath("$.data.syntaxIssue").value("missing_value"))
                    .andExpect(jsonPath("$.data.start").value(8)).andExpect(jsonPath("$.data.end").value(8));
        }
        for (String endpoint : List.of("validate", "subscribe")) {
            mvc.perform(get("/api/logs/sse/" + endpoint).param("searchSyntax", "structured-v1").param("logContent", "service:")
                            .accept(endpoint.equals("subscribe") ? MediaType.TEXT_EVENT_STREAM : MediaType.APPLICATION_JSON))
                    .andExpect(status().isBadRequest())
                    .andExpect(header().string("Content-Type", MediaType.APPLICATION_JSON_VALUE))
                    .andExpect(jsonPath("$.data.syntaxIssue").value("missing_value"))
                    .andExpect(jsonPath("$.data.start").value(8)).andExpect(jsonPath("$.data.end").value(8));
        }
        verifyNoInteractions(reader, emitters);
    }

    @Test
    void comparisonDiagnosticsPreserveSourceWithoutQueryText() throws Exception {
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/logs/analysis/compare")
                        .contentType(MediaType.APPLICATION_JSON).content("""
                            {"version":1,"parameters":{"start":"1000","end":"2000"},
                             "queries":[{"id":"a","searchSyntax":"structured-v1","search":"*"},
                                        {"id":"b","searchSyntax":"structured-v1","search":"service:"}]}
                            """))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.data.source").value("b"))
                .andExpect(jsonPath("$.data.syntaxIssue").value("missing_value"))
                .andExpect(jsonPath("$.data.start").value(8)).andExpect(jsonPath("$.data.end").value(8));
        verifyNoInteractions(reader, emitters);
    }

    @Test
    void selectedLiveAdmissionFailurePreservesRetryResponseWithoutReading() throws Exception {
        var admission = mock(ObservabilityQueryAdmissionService.class);
        var selected = MockMvcBuilders.standaloneSetup(new LogSseController(new LogSseServiceImpl(emitters, List.of(reader), admission)))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        for (var reason : ObservabilityQueryAdmissionException.Reason.values()) {
            when(admission.execute(eq("logs"), any()))
                    .thenThrow(new ObservabilityQueryAdmissionException("logs", reason, null));
            for (String endpoint : List.of("validate", "subscribe")) {
                selected.perform(get("/api/logs/sse/" + endpoint)
                                .param("logGroupSelection", "{\"version\":1,\"groups\":[{\"field\":\"attribute:x\",\"kind\":\"missing\"}]}")
                                .accept(endpoint.equals("subscribe") ? "text/event-stream" : "application/json"))
                        .andExpect(status().is(reason == ObservabilityQueryAdmissionException.Reason.OVERLOADED ? 429 : 503))
                        .andExpect(header().string("Retry-After", "1"));
            }
        }
        verifyNoInteractions(reader, emitters);
    }

    @Test
    void selectedLiveStorageFailureReturnsUnavailableWithoutEmitter() throws Exception {
        when(reader.prepareLogGroupSelection(anyString(), any()))
                .thenThrow(new TelemetryStorageUnavailableException());
        var admission = new ObservabilityQueryAdmissionService(1, 1, 1, 1, 0, Duration.ZERO);
        var selected = MockMvcBuilders.standaloneSetup(new LogSseController(new LogSseServiceImpl(emitters, List.of(reader), admission)))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        String selector = "{\"version\":1,\"groups\":[{\"field\":\"attribute:x\",\"kind\":\"missing\"}]}";
        for (String endpoint : List.of("validate", "subscribe")) {
            selected.perform(get("/api/logs/sse/" + endpoint).param("logGroupSelection", selector)
                            .accept(endpoint.equals("subscribe") ? "text/event-stream" : "application/json"))
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(jsonPath("$.msg").value("telemetry storage unavailable"));
        }
        verifyNoInteractions(emitters);
    }

    @Test
    void unsupportedStructuredCapabilitiesHaveStableReasonsBeforeReading() throws Exception {
        String[][] examples = {{"CIDR(@network.ip,10.0.0.0/8)", "cidr_unsupported"},
            {"@network.items[*].ip:value", "nested_path_unsupported"}};
        for (String[] example : examples) {
            for (String endpoint : List.of("list", "stats/overview", "stats/trace-coverage", "stats/trend",
                    "stats/group-by", "facets/fields", "facets/values")) {
                var result = mvc.perform(get("/api/logs/" + endpoint).param("start", "1000").param("end", "5000")
                                .param("groupBy", "service.name").param("field", "builtin:severityCategory")
                                .param("searchSyntax", "structured-v1").param("search", example[0]))
                        .andExpect(status().isBadRequest())
                        .andExpect(jsonPath("$.msg").value("observability_log_filter_invalid"))
                        .andExpect(jsonPath("$.data.reason").value(example[1]));
                assertFalse(result.andReturn().getResponse().getContentAsString().contains(example[0]));
            }
            for (String endpoint : List.of("validate", "subscribe")) {
                var result = mvc.perform(get("/api/logs/sse/" + endpoint).param("searchSyntax", "structured-v1")
                                .param("logContent", example[0]).accept(endpoint.equals("subscribe") ? "text/event-stream" : "application/json"))
                        .andExpect(status().isBadRequest())
                        .andExpect(jsonPath("$.msg").value("observability_log_filter_invalid"))
                        .andExpect(jsonPath("$.data.reason").value(example[1]));
                assertFalse(result.andReturn().getResponse().getContentAsString().contains(example[0]));
            }
        }
        verifyNoInteractions(reader, emitters);
    }

    @Test
    void fullTextIsUnsupportedForLiveBeforeAnyReaderOrEmitterCall() throws Exception {
        for (String endpoint : List.of("validate", "subscribe")) {
            var result = mvc.perform(get("/api/logs/sse/" + endpoint).param("searchSyntax", "structured-v1")
                            .param("logContent", "*:private-marker")
                            .accept(endpoint.equals("subscribe") ? "text/event-stream" : "application/json"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.msg").value(LogFilterQueryException.ERROR_CODE))
                    .andExpect(jsonPath("$.data.reason").value("full_text_unsupported"));
            assertFalse(result.andReturn().getResponse().getContentAsString().contains("private-marker"));
        }
        verifyNoInteractions(reader, emitters);
    }

    @Test
    void historyFullTextReachesTheStructuredReaderWithTrustedWorkspace() throws Exception {
        when(reader.structuredLogFacetFields(any())).thenReturn(LogFacets.Fields.empty(new LogFacets.Window(1000L, 5000L)));
        mvc.perform(get("/api/logs/facets/fields").param("start", "1000").param("end", "5000")
                        .param("searchSyntax", "structured-v1").param("search", "*:private-marker"))
                .andExpect(status().isOk());
        var query = ArgumentCaptor.forClass(LogSearchQuery.class);
        verify(reader).structuredLogFacetFields(query.capture());
        assertEquals(LogSearchParser.parse("*:private-marker"), query.getValue().expression());
        assertEquals("default", query.getValue().scope().workspaceId());
        assertEquals(1000L, query.getValue().scope().start());
        assertEquals(5000L, query.getValue().scope().end());
        verifyNoInteractions(emitters);
    }

    @Test
    void malformedGroupSelectionsFailBeforeAnyHistoryRead() throws Exception {
        for (String endpoint : List.of("list", "stats/overview", "stats/trace-coverage", "stats/trend",
                "stats/group-by", "facets/fields", "facets/values", "analysis")) {
            for (String selection : List.of("{", "{\"version\":99,\"groups\":[]}",
                    "{\"version\":1,\"groups\":[{\"field\":\"attribute:proof.status\",\"kind\":\"value\"}]}")) {
                mvc.perform(get("/api/logs/" + endpoint).param("start", "1000").param("end", "5000")
                                .param("groupBy", "service.name").param("field", "builtin:severityCategory")
                                .param("logGroupSelection", selection))
                        .andExpect(status().isBadRequest())
                        .andExpect(jsonPath("$.msg").value(LogFilterQueryException.ERROR_CODE));
            }
        }
        verifyNoInteractions(reader, emitters);
    }

    @Test
    void invalidOrAmbiguousAnalysisGroupingFailsBeforeReading() throws Exception {
        String grouping = "{\"version\":1,\"dimensions\":[{\"field\":\"builtin:serviceName\",\"limit\":5},"
                + "{\"field\":\"attribute:status\",\"limit\":4}]}";
        for (String invalid : List.of("{", "{\"version\":1,\"dimensions\":[]}",
                grouping.replace("\"limit\":5", "\"limit\":26"),
                grouping.replace("attribute:status", "builtin:serviceName"),
                grouping.replace("\"version\":1", "\"version\":1,\"version\":1"), grouping + " true")) {
            mvc.perform(get("/api/logs/analysis").param("start", "1000").param("end", "5000")
                            .param("grouping", invalid))
                    .andExpect(status().isBadRequest());
        }
        for (String conflicting : List.of("field", "limit")) {
            mvc.perform(get("/api/logs/analysis").param("start", "1000").param("end", "5000")
                            .param("grouping", grouping).param(conflicting, conflicting.equals("field") ? "builtin:serviceName" : "20"))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(reader, emitters);
    }

    @Test
    void incompatibleThroughputFailsBeforeReaders() throws Exception {
        mvc.perform(get("/api/logs/analysis").param("start", "1000").param("end", "2000")
                        .param("view", "groups").param("transform", "throughput"))
                .andExpect(status().isBadRequest());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/logs/analysis/compare")
                        .contentType(MediaType.APPLICATION_JSON).content("""
                            {"version":1,"parameters":{"start":"1000","end":"2000","view":"groups","transform":"throughput"},
                             "queries":[{"id":"a"},{"id":"b"}]}
                            """))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(reader, emitters);
    }

    @Test
    void invalidAnalysisMeasuresAndIncompatibleOrdersFailBeforeReading() throws Exception {
        for (String measure : List.of("{", "{\"function\":\"unsupported\",\"field\":\"attribute:duration\"}",
                "{\"function\":\"avg\",\"field\":\"builtin:serviceName\"}",
                "{\"function\":\"count\",\"field\":\"attribute:duration\"}",
                "{\"function\":\"avg\",\"function\":\"min\",\"field\":\"attribute:duration\"}",
                "{\"function\":\"count\"} true", " ".repeat(513))) {
            mvc.perform(get("/api/logs/analysis").param("start", "1000").param("end", "5000")
                            .param("measure", measure))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(get("/api/logs/analysis").param("start", "1000").param("end", "5000")
                        .param("measure", "{\"function\":\"avg\",\"field\":\"attribute:duration\"}")
                        .param("order", "count-desc"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/logs/analysis").param("start", "1000").param("end", "5000")
                        .param("order", "measure-desc"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(reader, emitters);
    }

    @Test
    void liveGroupSelectionHasExplicitCapabilityReasonWithoutSubscribing() throws Exception {
        String selection = "{\"version\":1,\"groups\":[{\"field\":\"attribute:proof.status\","
                + "\"kind\":\"value\",\"value\":\"2.0\"}]}";
        for (String endpoint : List.of("subscribe", "validate")) {
            mvc.perform(get("/api/logs/sse/" + endpoint).param("logGroupSelection", selection)
                            .accept(endpoint.equals("subscribe") ? MediaType.TEXT_EVENT_STREAM : MediaType.APPLICATION_JSON))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.msg").value(LogFilterQueryException.ERROR_CODE))
                    .andExpect(jsonPath("$.data.reason").value("group_selection_unsupported"));
        }
        mvc.perform(get("/api/logs/context").param("logRecordUid", "a".repeat(32))
                        .param("start", "1000").param("end", "5000").param("logGroupSelection", selection))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.msg").value(LogFilterQueryException.ERROR_CODE))
                .andExpect(jsonPath("$.data.reason").value("group_selection_unsupported"));
        verifyNoInteractions(reader, emitters);
    }

    @Test
    void quotedCapabilityNamesRemainLiteralInLivePreflight() throws Exception {
        for (String literal : List.of("\"*:hello\"", "\"CIDR(@network.ip,10.0.0.0/8)\"", "\"@items[*].ip:value\"")) {
            mvc.perform(get("/api/logs/sse/validate").param("searchSyntax", "structured-v1").param("logContent", literal))
                    .andExpect(status().isOk());
        }
        verifyNoInteractions(reader, emitters);
    }

    @Test
    void invalidHistoryFiltersReturnStableBadRequestBeforeReading() throws Exception {
        for (String endpoint : List.of("list", "stats/overview", "stats/trace-coverage", "stats/trend",
                "stats/group-by", "facets/fields", "facets/values")) {
            for (String filter : List.of("key=a AND nonsense", "key=a AND key=b", "key IN (a,)",
                    "key=a OR key=b", "unsafe key=value")) {
                for (String scope : List.of("resourceFilter", "attributeFilter")) {
                    mvc.perform(get("/api/logs/" + endpoint).param("start", "1000").param("end", "5000")
                                    .param("groupBy", "severity").param("field", "severity").param(scope, filter))
                            .andExpect(status().isBadRequest())
                            .andExpect(jsonPath("$.msg").value(LogFilterQueryException.ERROR_CODE));
                }
            }
        }
        verifyNoInteractions(reader, emitters);
    }

    @Test
    void invalidLiveFiltersReturnJsonWithoutSubscribing() throws Exception {
        for (String endpoint : List.of("subscribe", "validate")) {
            mvc.perform(get("/api/logs/sse/" + endpoint).param("resourceFilter", "key=a OR key=b")
                            .accept(endpoint.equals("subscribe") ? MediaType.TEXT_EVENT_STREAM : MediaType.APPLICATION_JSON))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.msg").value(LogFilterQueryException.ERROR_CODE));
        }
        verifyNoInteractions(reader, emitters);
    }

    @Test
    void validPreflightDoesNotSubscribeOrRead() throws Exception {
        mvc.perform(get("/api/logs/sse/validate").param("resourceFilter", "key='a OR b'")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk()).andExpect(jsonPath("$.code").value(0));
        verifyNoInteractions(reader, emitters);
    }

    @Test
    void structuredHistoryRejectsMalformedExpressionsAndUnknownSyntaxBeforeReading() throws Exception {
        for (String endpoint : List.of("list", "stats/overview", "stats/trace-coverage", "stats/trend",
                "stats/group-by", "facets/fields", "facets/values")) {
            for (String expression : List.of("service:(checkout OR", "@duration:[100 TO 1]",
                    "resource.hertzbeat.workspace.id:other", "@duration:>=9007199254740993")) {
                mvc.perform(get("/api/logs/" + endpoint).param("start", "1000").param("end", "5000")
                                .param("groupBy", "service.name").param("field", "builtin:severityCategory")
                                .param("searchSyntax", "structured-v1").param("search", expression))
                        .andExpect(status().isBadRequest())
                        .andExpect(jsonPath("$.msg").value(LogFilterQueryException.ERROR_CODE));
            }
            mvc.perform(get("/api/logs/" + endpoint).param("start", "1000").param("end", "5000")
                            .param("groupBy", "service.name").param("field", "builtin:severityCategory")
                            .param("searchSyntax", "structured-v2"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.msg").value(LogFilterQueryException.ERROR_CODE));
        }
        verifyNoInteractions(reader, emitters);
    }

    @Test
    void structuredLiveRejectsInvalidSyntaxAndAcceptsValidPreflightWithoutSubscription() throws Exception {
        for (String endpoint : List.of("subscribe", "validate")) {
            for (String syntax : List.of("structured-v1", "structured-v2")) {
                mvc.perform(get("/api/logs/sse/" + endpoint).param("searchSyntax", syntax)
                                .param("logContent", "service:(checkout OR")
                                .accept(endpoint.equals("subscribe") ? MediaType.TEXT_EVENT_STREAM : MediaType.APPLICATION_JSON))
                        .andExpect(status().isBadRequest())
                        .andExpect(jsonPath("$.msg").value(LogFilterQueryException.ERROR_CODE));
            }
        }
        mvc.perform(get("/api/logs/sse/validate").param("searchSyntax", "structured-v1")
                        .param("logContent", "(service:checkout OR service:billing) AND @http.status_code:[500 TO 599]"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.code").value(0));
        verifyNoInteractions(reader, emitters);
    }

}
