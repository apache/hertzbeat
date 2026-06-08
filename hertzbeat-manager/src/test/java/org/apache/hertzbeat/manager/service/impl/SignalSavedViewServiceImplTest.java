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
import org.apache.hertzbeat.common.entity.dto.SignalSavedView;
import org.apache.hertzbeat.common.entity.manager.SignalSavedViewEntity;
import org.apache.hertzbeat.manager.dao.SignalSavedViewDao;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
        assertEquals("/log/manage?search=timeout", views.get(0).getRoute());
        verify(signalSavedViewDao).findBySignalOrderByUpdateTimeDesc("logs");
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
        when(signalSavedViewDao.save(any(SignalSavedViewEntity.class))).thenAnswer(invocation -> {
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
        verify(signalSavedViewDao).save(captor.capture());
        assertEquals("operator", captor.getValue().getCreator());
        assertEquals("metrics", captor.getValue().getSignal());
    }

    @Test
    void upsertSignalSavedViewUpdatesExistingSharedViewWithoutChangingOwner() {
        SignalSavedViewEntity existing = SignalSavedViewEntity.builder()
                .id(3L)
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
        when(signalSavedViewDao.save(any(SignalSavedViewEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SignalSavedView saved = signalSavedViewService.upsertSignalSavedView("operator", SignalSavedView.builder()
                .signal("traces")
                .viewKey("slow-checkout")
                .label("Slow checkout")
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
    }

    @Test
    void deleteSignalSavedViewUsesSharedSignalAndKey() {
        signalSavedViewService.deleteSignalSavedView("operator", "metrics", "checkout-p95");

        verify(signalSavedViewDao).deleteBySignalAndViewKey("metrics", "checkout-p95");
    }
}
