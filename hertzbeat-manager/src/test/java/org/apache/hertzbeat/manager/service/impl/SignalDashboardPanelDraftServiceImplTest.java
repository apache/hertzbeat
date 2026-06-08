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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.dto.SignalDashboardPanelDraft;
import org.apache.hertzbeat.common.entity.manager.SignalDashboardPanelDraftEntity;
import org.apache.hertzbeat.manager.dao.SignalDashboardPanelDraftDao;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link SignalDashboardPanelDraftServiceImpl}.
 */
@ExtendWith(MockitoExtension.class)
class SignalDashboardPanelDraftServiceImplTest {

    @Mock
    private SignalDashboardPanelDraftDao signalDashboardPanelDraftDao;

    @InjectMocks
    private SignalDashboardPanelDraftServiceImpl signalDashboardPanelDraftService;

    @Test
    void listSignalDashboardPanelDraftsReturnsCurrentUserSignalDrafts() {
        SignalDashboardPanelDraftEntity entity = SignalDashboardPanelDraftEntity.builder()
                .id(1L)
                .creator("operator")
                .signal("traces")
                .draftKey("slow-checkout-panel")
                .title("Slow checkout traces")
                .description("Trace latency panel")
                .visualization("time-series")
                .route("/trace/manage?serviceName=checkout&view=time-series")
                .querySnapshot("{\"serviceName\":\"checkout\"}")
                .payload("{\"source\":\"explorer\"}")
                .createTime(LocalDateTime.now().minusMinutes(1))
                .updateTime(LocalDateTime.now())
                .build();
        when(signalDashboardPanelDraftDao.findByCreatorAndSignalOrderByUpdateTimeDesc("operator", "traces"))
                .thenReturn(List.of(entity));

        List<SignalDashboardPanelDraft> drafts = signalDashboardPanelDraftService
                .listSignalDashboardPanelDrafts("operator", "TRACES");

        assertEquals(1, drafts.size());
        assertEquals("slow-checkout-panel", drafts.get(0).getDraftKey());
        assertEquals("time-series", drafts.get(0).getVisualization());
        verify(signalDashboardPanelDraftDao).findByCreatorAndSignalOrderByUpdateTimeDesc("operator", "traces");
    }

    @Test
    void upsertSignalDashboardPanelDraftCreatesBoundedDraft() {
        SignalDashboardPanelDraft request = SignalDashboardPanelDraft.builder()
                .signal("metrics")
                .draftKey("checkout-p95-panel")
                .title("Checkout p95")
                .description("Latency panel")
                .visualization("graph")
                .route("/ingestion/otlp/metrics?query=http.server.duration")
                .querySnapshot("{\"query\":\"http.server.duration\"}")
                .payload("{\"scope\":\"service\"}")
                .build();
        when(signalDashboardPanelDraftDao.findByCreatorAndSignalAndDraftKey("operator", "metrics", "checkout-p95-panel"))
                .thenReturn(Optional.empty());
        when(signalDashboardPanelDraftDao.save(any(SignalDashboardPanelDraftEntity.class))).thenAnswer(invocation -> {
            SignalDashboardPanelDraftEntity saved = invocation.getArgument(0);
            saved.setId(7L);
            return saved;
        });

        SignalDashboardPanelDraft saved = signalDashboardPanelDraftService
                .upsertSignalDashboardPanelDraft("operator", request);

        assertEquals(7L, saved.getId());
        assertEquals("metrics", saved.getSignal());
        assertEquals("graph", saved.getVisualization());
        ArgumentCaptor<SignalDashboardPanelDraftEntity> captor =
                ArgumentCaptor.forClass(SignalDashboardPanelDraftEntity.class);
        verify(signalDashboardPanelDraftDao).save(captor.capture());
        assertEquals("operator", captor.getValue().getCreator());
        assertEquals("checkout-p95-panel", captor.getValue().getDraftKey());
    }

    @Test
    void upsertSignalDashboardPanelDraftUpdatesExistingDraft() {
        SignalDashboardPanelDraftEntity existing = SignalDashboardPanelDraftEntity.builder()
                .id(3L)
                .creator("operator")
                .signal("logs")
                .draftKey("error-logs-panel")
                .title("Old")
                .visualization("list")
                .route("/log/manage")
                .createTime(LocalDateTime.now().minusDays(1))
                .updateTime(LocalDateTime.now().minusDays(1))
                .build();
        when(signalDashboardPanelDraftDao.findByCreatorAndSignalAndDraftKey("operator", "logs", "error-logs-panel"))
                .thenReturn(Optional.of(existing));
        when(signalDashboardPanelDraftDao.save(any(SignalDashboardPanelDraftEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        SignalDashboardPanelDraft saved = signalDashboardPanelDraftService.upsertSignalDashboardPanelDraft(
                "operator",
                SignalDashboardPanelDraft.builder()
                        .signal("logs")
                        .draftKey("error-logs-panel")
                        .title("Error logs")
                        .visualization("table")
                        .route("/log/manage?severityText=ERROR&view=table")
                        .build());

        assertEquals(3L, saved.getId());
        assertEquals("Error logs", saved.getTitle());
        assertEquals("table", saved.getVisualization());
        assertEquals("/log/manage?severityText=ERROR&view=table", saved.getRoute());
    }

    @Test
    void upsertSignalDashboardPanelDraftRejectsWrongSignalRoute() {
        SignalDashboardPanelDraft request = SignalDashboardPanelDraft.builder()
                .signal("metrics")
                .draftKey("wrong-route")
                .title("Wrong")
                .visualization("graph")
                .route("/trace/manage?serviceName=checkout")
                .build();

        assertThrows(IllegalArgumentException.class,
                () -> signalDashboardPanelDraftService.upsertSignalDashboardPanelDraft("operator", request));
    }

    @Test
    void upsertSignalDashboardPanelDraftAcceptsAlertRoute() {
        SignalDashboardPanelDraft request = SignalDashboardPanelDraft.builder()
                .signal("alerts")
                .draftKey("checkout-firing-alerts")
                .title("Checkout firing alerts")
                .description("Alert group panel")
                .visualization("list")
                .route("/alert?search=checkout&status=firing")
                .querySnapshot("/alert?search=checkout&status=firing")
                .payload("{\"scope\":\"service\"}")
                .build();
        when(signalDashboardPanelDraftDao.findByCreatorAndSignalAndDraftKey("operator", "alerts",
                "checkout-firing-alerts")).thenReturn(Optional.empty());
        when(signalDashboardPanelDraftDao.save(any(SignalDashboardPanelDraftEntity.class))).thenAnswer(invocation -> {
            SignalDashboardPanelDraftEntity saved = invocation.getArgument(0);
            saved.setId(8L);
            return saved;
        });

        SignalDashboardPanelDraft saved = signalDashboardPanelDraftService
                .upsertSignalDashboardPanelDraft("operator", request);

        assertEquals(8L, saved.getId());
        assertEquals("alerts", saved.getSignal());
        assertEquals("list", saved.getVisualization());
        assertEquals("/alert?search=checkout&status=firing", saved.getRoute());
    }

    @Test
    void upsertSignalDashboardPanelDraftRejectsInvalidVisualization() {
        SignalDashboardPanelDraft request = SignalDashboardPanelDraft.builder()
                .signal("logs")
                .draftKey("bad-visualization")
                .title("Bad")
                .visualization("trace")
                .route("/log/manage")
                .build();

        assertThrows(IllegalArgumentException.class,
                () -> signalDashboardPanelDraftService.upsertSignalDashboardPanelDraft("operator", request));
    }

    @Test
    void upsertSignalDashboardPanelDraftRejectsMalformedPayloadJson() {
        SignalDashboardPanelDraft request = SignalDashboardPanelDraft.builder()
                .signal("logs")
                .draftKey("bad-payload")
                .title("Bad payload")
                .visualization("list")
                .route("/log/manage?search=timeout")
                .querySnapshot("/log/manage?search=timeout")
                .payload("{\"source\":\"explorer\"")
                .build();

        assertThrows(IllegalArgumentException.class,
                () -> signalDashboardPanelDraftService.upsertSignalDashboardPanelDraft("operator", request));
    }

    @Test
    void deleteSignalDashboardPanelDraftUsesCurrentUserSignalAndKey() {
        signalDashboardPanelDraftService.deleteSignalDashboardPanelDraft("operator", "metrics", "checkout-p95-panel");

        verify(signalDashboardPanelDraftDao)
                .deleteByCreatorAndSignalAndDraftKey("operator", "metrics", "checkout-p95-panel");
    }
}
