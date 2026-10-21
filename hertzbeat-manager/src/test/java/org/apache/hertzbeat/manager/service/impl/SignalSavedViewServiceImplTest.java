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

package org.apache.hertzbeat.manager.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.dto.SignalSavedView;
import org.apache.hertzbeat.common.entity.manager.SignalSavedViewEntity;
import org.apache.hertzbeat.manager.dao.SignalSavedViewDao;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link SignalSavedViewServiceImpl}.
 */
@ExtendWith(MockitoExtension.class)
class SignalSavedViewServiceImplTest {

    @Mock
    private SignalSavedViewDao signalSavedViewDao;

    @InjectMocks
    private SignalSavedViewServiceImpl signalSavedViewService;

    @ParameterizedTest
    @ValueSource(strings = {"p50", "p75", "p90", "p95", "p98", "p99", "p96"})
    void percentileSavedStateIsRetainedExactlyIncludingEditableUnknownLegacyState(String function) {
        String analysis = "{\"version\":1,\"representation\":\"table\",\"limit\":20,\"order\":\"measure-desc\",\"minCount\":1,"
                + "\"measure\":{\"function\":\"" + function + "\",\"field\":\"attribute:duration\"}}";
        String payload = org.apache.hertzbeat.common.util.JsonUtil.toJson(java.util.Map.of("version", 1,
                "query", java.util.Map.of("signal", "logs", "logAnalysis", analysis)));
        when(signalSavedViewDao.saveAndFlush(any(SignalSavedViewEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        var saved = signalSavedViewService.upsertSignalSavedView("operator", SignalSavedView.builder()
                .signal("logs").viewKey("percentile").label("Percentile").route("/explore?signal=logs").payload(payload).build());
        assertEquals(payload, saved.getPayload());
        assertEquals("/explore?signal=logs", saved.getRoute());
    }

    @Test
    void negativeRevisionIsInvalidBeforeLookup() {
        var request = SignalSavedView.builder().signal("logs").viewKey("shared").label("Edit")
                .route("/log/manage").revision(-1L).build();
        assertThrows(IllegalArgumentException.class, () -> signalSavedViewService.upsertSignalSavedView("operator", request));
        verifyNoInteractions(signalSavedViewDao);
    }

    @Test
    void staleWritesDeletesAndResurrectionCannotReplaceNewerContent() {
        var existing = SignalSavedViewEntity.builder().signal("logs").viewKey("shared").revision(2L)
                .label("Newer").route("/log/manage").payload("{\"opaque\":true}").build();
        when(signalSavedViewDao.findBySignalAndViewKey("logs", "shared")).thenReturn(Optional.of(existing));
        var stale = SignalSavedView.builder().signal("logs").viewKey("shared").label("Stale")
                .route("/log/manage").revision(1L).build();
        assertThrows(SignalSavedViewConflictException.class, () -> signalSavedViewService.upsertSignalSavedView("operator", stale));
        assertEquals("Newer", existing.getLabel());
        assertEquals("{\"opaque\":true}", existing.getPayload());
        assertThrows(SignalSavedViewConflictException.class,
                () -> signalSavedViewService.deleteSignalSavedView("operator", "logs", "shared", 1L));
        when(signalSavedViewDao.findBySignalAndViewKey("logs", "shared")).thenReturn(Optional.empty());
        assertThrows(SignalSavedViewConflictException.class, () -> signalSavedViewService.upsertSignalSavedView("operator", stale));
    }

    @Test
    void listSignalSavedViewsReturnsWorkspaceSharedSignalViews() {
        SignalSavedViewEntity entity = SignalSavedViewEntity.builder()
                .id(1L)
                .creator("teammate")
                .signal("logs")
                .viewKey("checkout-errors")
                .label("Checkout errors")
                .description("Errors by service")
                .route("/log/manage?search=timeout")
                .querySnapshot("{\"search\":\"timeout\"}")
                .payload("{\"source\":\"server\"}")
                .createTime(LocalDateTime.now().minusMinutes(1))
                .updateTime(LocalDateTime.now())
                .build();
        when(signalSavedViewDao.findBySignalOrderByUpdateTimeDesc("logs"))
                .thenReturn(List.of(entity));

        List<SignalSavedView> views = signalSavedViewService.listSignalSavedViews("operator", "LOGS");

        assertEquals(1, views.size());
        assertEquals("checkout-errors", views.get(0).getViewKey());
        assertEquals("teammate", views.get(0).getCreator());
        assertEquals("/log/manage?search=timeout", views.get(0).getRoute());
        verify(signalSavedViewDao).findBySignalOrderByUpdateTimeDesc("logs");
    }

    @Test
    void listPreservesUnconvertibleLegacyRecordWithoutWriting() {
        LocalDateTime updatedAt = LocalDateTime.of(2026, 1, 2, 3, 4);
        SignalSavedViewEntity legacy = SignalSavedViewEntity.builder()
                .signal("logs").viewKey("legacy").label("Legacy query")
                .route("/removed/explorer?unsupportedFilter=keep")
                .querySnapshot("unparsed legacy snapshot").payload("{invalid legacy JSON")
                .updateTime(updatedAt).build();
        when(signalSavedViewDao.findBySignalOrderByUpdateTimeDesc("logs")).thenReturn(List.of(legacy));

        SignalSavedView result = signalSavedViewService.listSignalSavedViews("viewer", "logs").getFirst();

        assertEquals(legacy.getRoute(), result.getRoute());
        assertEquals(legacy.getQuerySnapshot(), result.getQuerySnapshot());
        assertEquals(legacy.getPayload(), result.getPayload());
        assertEquals(updatedAt, result.getUpdateTime());
        verify(signalSavedViewDao).findBySignalOrderByUpdateTimeDesc("logs");
        verifyNoMoreInteractions(signalSavedViewDao);
    }

    @Test
    void upsertSignalSavedViewCreatesBoundedServerView() {
        SignalSavedView request = SignalSavedView.builder()
                .signal("metrics")
                .viewKey("checkout-p95")
                .label("Checkout p95")
                .description("Latency panel")
                .route("/ingestion/otlp/metrics?query=http.server.duration")
                .querySnapshot("{\"query\":\"http.server.duration\"}")
                .payload("{\"scope\":\"service\"}")
                .build();
        when(signalSavedViewDao.findBySignalAndViewKey("metrics", "checkout-p95"))
                .thenReturn(Optional.empty());
        when(signalSavedViewDao.saveAndFlush(any(SignalSavedViewEntity.class))).thenAnswer(invocation -> {
            SignalSavedViewEntity saved = invocation.getArgument(0);
            saved.setId(7L);
            return saved;
        });

        SignalSavedView saved = signalSavedViewService.upsertSignalSavedView("operator", request);

        assertEquals(7L, saved.getId());
        assertEquals("metrics", saved.getSignal());
        assertEquals("checkout-p95", saved.getViewKey());
        assertEquals("/ingestion/otlp/metrics?query=http.server.duration", saved.getRoute());
        ArgumentCaptor<SignalSavedViewEntity> captor = ArgumentCaptor.forClass(SignalSavedViewEntity.class);
        verify(signalSavedViewDao).saveAndFlush(captor.capture());
        assertEquals("operator", captor.getValue().getCreator());
        assertEquals("metrics", captor.getValue().getSignal());
    }

    @ParameterizedTest
    @ValueSource(strings = {"logs", "traces", "metrics"})
    void upsertCanonicalExploreViewPreservesOpaqueQueryPayload(String signal) {
        String route = "/explore?signal=" + signal + "&timeRange=last-30m&query=GET+%2Fcheckout";
        String payload = "{\"version\":1,\"query\":{\"signal\":\"" + signal
                + "\",\"timeRange\":\"last-30m\"},\"futureField\":{\"keep\":true}}";
        when(signalSavedViewDao.saveAndFlush(any(SignalSavedViewEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        SignalSavedView saved = signalSavedViewService.upsertSignalSavedView("operator", SignalSavedView.builder()
                .signal(signal).viewKey("saved-query").label("Saved query")
                .route(route).querySnapshot("GET /checkout").payload(payload).build());

        assertEquals(route, saved.getRoute());
        assertEquals("GET /checkout", saved.getQuerySnapshot());
        assertEquals(payload, saved.getPayload());
    }

    @Test
    void preservesOptionalLogAnalysisWithoutChangingLegacyAssetSemantics() {
        String analysis = "{\"version\":1,\"representation\":\"toplist\",\"field\":\"attribute:http.route\","
                + "\"limit\":20,\"order\":\"count-desc\",\"minCount\":1}";
        String route = "/explore?signal=logs&timeRange=last-30m&logAnalysis="
                + java.net.URLEncoder.encode(analysis, java.nio.charset.StandardCharsets.UTF_8);
        String payload = org.apache.hertzbeat.common.util.JsonUtil.toJson(java.util.Map.of("version", 1,
                "query", java.util.Map.of("signal", "logs", "timeRange", "last-30m", "logAnalysis", analysis)));
        when(signalSavedViewDao.saveAndFlush(any(SignalSavedViewEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        var saved = signalSavedViewService.upsertSignalSavedView("operator", SignalSavedView.builder()
                .signal("logs").viewKey("analysis").label("Analysis").route(route).payload(payload).build());
        assertEquals(route, saved.getRoute());
        assertEquals(payload, saved.getPayload());
    }

    @ParameterizedTest
    @CsvSource({"logs,/log/manage", "traces,/trace/manage", "metrics,/ingestion/otlp/metrics"})
    void upsertKeepsExactLegacyRouteCompatibility(String signal, String route) {
        when(signalSavedViewDao.saveAndFlush(any(SignalSavedViewEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        for (String legacyRoute : List.of(route, route + "?query=timeout&range=last-1h")) {
            SignalSavedView saved = signalSavedViewService.upsertSignalSavedView("operator", SignalSavedView.builder()
                    .signal(signal).viewKey("legacy").label("Legacy query").route(legacyRoute)
                    .payload("{\"createdAt\":1780000000000}").build());
            assertEquals(legacyRoute, saved.getRoute());
            assertEquals("{\"createdAt\":1780000000000}", saved.getPayload());
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "/explore", "/explore?query=timeout", "/explore?signal=", "/explore?signal=metrics",
            "/explore?signal=logs&signal=logs", "/explore?signal=logs&signal=traces",
            "/explore?signal=logs&%73ignal=logs", "/explore?%2573ignal=logs",
            "/explore?signal=%FF", "/explore?signal=logs%00", "/explore?signal=logs&query=%",
            "https://example.com/explore?signal=logs", "//example.com/explore?signal=logs",
            "/explore?signal=logs#result", "/explore?signal=logs#", "/explore/extra?signal=logs",
            "/explore/../explore?signal=logs", "/%65xplore?signal=logs", "/explore%3Fsignal=logs",
            "/explore%5C?signal=logs", "/explore\\?signal=logs", "/explore?signal=logs\\",
            "/log/manage?query=timeout#result", "/log/manage/extra?signal=logs"
    })
    void rejectAmbiguousOrNonLocalRouteBeforeStorageLookup(String route) {
        SignalSavedView request = SignalSavedView.builder()
                .signal("logs").viewKey("saved-query").label("Saved query").route(route).build();

        assertThrows(IllegalArgumentException.class,
                () -> signalSavedViewService.upsertSignalSavedView("operator", request));

        verifyNoInteractions(signalSavedViewDao);
    }

    @Test
    void upsertSignalSavedViewUpdatesExistingSharedViewWithoutChangingOwner() {
        SignalSavedViewEntity existing = SignalSavedViewEntity.builder()
                .id(3L)
                .revision(2L)
                .creator("teammate")
                .signal("traces")
                .viewKey("slow-checkout")
                .label("Old")
                .route("/trace/manage")
                .createTime(LocalDateTime.now().minusDays(1))
                .updateTime(LocalDateTime.now().minusDays(1))
                .build();
        when(signalSavedViewDao.findBySignalAndViewKey("traces", "slow-checkout"))
                .thenReturn(Optional.of(existing));
        when(signalSavedViewDao.saveAndFlush(any(SignalSavedViewEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SignalSavedView saved = signalSavedViewService.upsertSignalSavedView("operator", SignalSavedView.builder()
                .signal("traces")
                .viewKey("slow-checkout")
                .label("Slow checkout")
                .revision(2L)
                .route("/trace/manage?serviceName=checkout")
                .build());

        assertEquals(3L, saved.getId());
        assertEquals("Slow checkout", saved.getLabel());
        assertEquals("/trace/manage?serviceName=checkout", saved.getRoute());
        assertEquals("teammate", existing.getCreator());
    }

    @Test
    void upsertSignalSavedViewRejectsWrongSignalRoute() {
        SignalSavedView request = SignalSavedView.builder()
                .signal("logs")
                .viewKey("wrong-route")
                .label("Wrong")
                .route("/trace/manage?serviceName=checkout")
                .build();

        assertThrows(IllegalArgumentException.class,
                () -> signalSavedViewService.upsertSignalSavedView("operator", request));
    }

    @Test
    void upsertSignalSavedViewRejectsInvalidViewKey() {
        SignalSavedView request = SignalSavedView.builder()
                .signal("logs")
                .viewKey("bad key")
                .label("Bad")
                .route("/log/manage")
                .build();

        assertThrows(IllegalArgumentException.class,
                () -> signalSavedViewService.upsertSignalSavedView("operator", request));
    }

    @Test
    void upsertSignalSavedViewRejectsMalformedPayloadJson() {
        SignalSavedView request = SignalSavedView.builder()
                .signal("logs")
                .viewKey("bad-payload")
                .label("Bad payload")
                .route("/log/manage?search=timeout")
                .querySnapshot("/log/manage?search=timeout")
                .payload("{\"createdAt\":1780740000000")
                .build();

        assertThrows(IllegalArgumentException.class,
                () -> signalSavedViewService.upsertSignalSavedView("operator", request));
        verify(signalSavedViewDao, never()).save(any());
    }

    @ParameterizedTest
    @CsvSource({"payload,false", "payload,true", "querySnapshot,false", "querySnapshot,true"})
    void acceptsTextAtExactUtf8StorageBoundary(String field, boolean multibyte) {
        String text = boundedText(field, 65535, multibyte);
        SignalSavedView request = textRequest(field, text);
        when(signalSavedViewDao.saveAndFlush(any(SignalSavedViewEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        SignalSavedView saved = signalSavedViewService.upsertSignalSavedView("operator", request);

        assertEquals(65535, text.getBytes(StandardCharsets.UTF_8).length);
        assertEquals(text, "payload".equals(field) ? saved.getPayload() : saved.getQuerySnapshot());
    }

    @ParameterizedTest
    @CsvSource({"payload,false", "payload,true", "querySnapshot,false", "querySnapshot,true"})
    void rejectsTextOneUtf8ByteBeyondStorageBeforeSave(String field, boolean multibyte) {
        String text = boundedText(field, 65536, multibyte);
        assertEquals(65536, text.getBytes(StandardCharsets.UTF_8).length);

        IllegalArgumentException failure = assertThrows(IllegalArgumentException.class,
                () -> signalSavedViewService.upsertSignalSavedView("operator", textRequest(field, text)));

        assertEquals(field + " is too long", failure.getMessage());
        verify(signalSavedViewDao, never()).save(any());
    }

    private SignalSavedView textRequest(String field, String text) {
        return SignalSavedView.builder().signal("logs").viewKey("bounded-query").label("Bounded query")
                .route("/explore?signal=logs")
                .payload("payload".equals(field) ? text : null)
                .querySnapshot("querySnapshot".equals(field) ? text : null).build();
    }

    private String boundedText(String field, int bytes, boolean multibyte) {
        int contentBytes = bytes - ("payload".equals(field) ? 12 : 0);
        String value = multibyte ? "\u00e9".repeat(contentBytes / 2) + "a".repeat(contentBytes % 2)
                : "a".repeat(contentBytes);
        return "payload".equals(field) ? "{\"query\":\"" + value + "\"}" : value;
    }

    @Test
    void deleteSignalSavedViewUsesSharedSignalAndKey() {
        var entity = SignalSavedViewEntity.builder().revision(2L).build();
        when(signalSavedViewDao.findBySignalAndViewKey("metrics", "checkout-p95")).thenReturn(Optional.of(entity));
        signalSavedViewService.deleteSignalSavedView("operator", "metrics", "checkout-p95", 2L);
        verify(signalSavedViewDao).delete(entity);
        verify(signalSavedViewDao).flush();
    }
}
