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
import org.apache.hertzbeat.common.entity.dto.SignalDashboard;
import org.apache.hertzbeat.common.entity.manager.SignalDashboardEntity;
import org.apache.hertzbeat.manager.dao.SignalDashboardDao;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link SignalDashboardServiceImpl}.
 */
@ExtendWith(MockitoExtension.class)
class SignalDashboardServiceImplTest {

    @Mock
    private SignalDashboardDao signalDashboardDao;

    @InjectMocks
    private SignalDashboardServiceImpl signalDashboardService;

    @Test
    void listSignalDashboardsReturnsWorkspaceSharedDashboards() {
        SignalDashboardEntity entity = SignalDashboardEntity.builder()
                .id(1L)
                .creator("teammate")
                .dashboardKey("signals-overview")
                .title("Signals overview")
                .description("Logs, traces, and metrics")
                .tags("logs,traces,metrics")
                .layout("[{\"i\":\"panel-1\",\"x\":0,\"y\":0,\"w\":6,\"h\":4}]")
                .widgets("[{\"id\":\"panel-1\",\"signal\":\"logs\"}]")
                .variables("[]")
                .panelMap("{}")
                .version("v1")
                .createTime(LocalDateTime.now().minusMinutes(1))
                .updateTime(LocalDateTime.now())
                .build();
        when(signalDashboardDao.findAllByOrderByUpdateTimeDesc()).thenReturn(List.of(entity));

        List<SignalDashboard> dashboards = signalDashboardService.listSignalDashboards("operator");

        assertEquals(1, dashboards.size());
        assertEquals("signals-overview", dashboards.get(0).getDashboardKey());
        assertEquals("v1", dashboards.get(0).getVersion());
        verify(signalDashboardDao).findAllByOrderByUpdateTimeDesc();
    }

    @Test
    void upsertSignalDashboardCreatesBoundedComposition() {
        SignalDashboard request = SignalDashboard.builder()
                .dashboardKey("signals-overview")
                .title("Signals overview")
                .description("Dashboard from signal panel drafts")
                .tags("logs,traces,metrics")
                .layout("[{\"i\":\"logs-panel\",\"x\":0,\"y\":0,\"w\":6,\"h\":4}]")
                .widgets("[{\"id\":\"logs-panel\",\"draftKey\":\"logs-panel\"}]")
                .variables("[]")
                .panelMap("{\"logs-panel\":\"logs-panel\"}")
                .version("v1")
                .build();
        when(signalDashboardDao.findByDashboardKey("signals-overview"))
                .thenReturn(Optional.empty());
        when(signalDashboardDao.save(any(SignalDashboardEntity.class))).thenAnswer(invocation -> {
            SignalDashboardEntity saved = invocation.getArgument(0);
            saved.setId(7L);
            return saved;
        });

        SignalDashboard saved = signalDashboardService.upsertSignalDashboard("operator", request);

        assertEquals(7L, saved.getId());
        assertEquals("signals-overview", saved.getDashboardKey());
        assertEquals("logs,traces,metrics", saved.getTags());
        ArgumentCaptor<SignalDashboardEntity> captor = ArgumentCaptor.forClass(SignalDashboardEntity.class);
        verify(signalDashboardDao).save(captor.capture());
        assertEquals("operator", captor.getValue().getCreator());
        assertEquals("v1", captor.getValue().getVersion());
    }

    @Test
    void upsertSignalDashboardUpdatesExistingSharedCompositionWithoutChangingOwner() {
        SignalDashboardEntity existing = SignalDashboardEntity.builder()
                .id(3L)
                .creator("teammate")
                .dashboardKey("signals-overview")
                .title("Old")
                .layout("[]")
                .widgets("[]")
                .createTime(LocalDateTime.now().minusDays(1))
                .updateTime(LocalDateTime.now().minusDays(1))
                .build();
        when(signalDashboardDao.findByDashboardKey("signals-overview"))
                .thenReturn(Optional.of(existing));
        when(signalDashboardDao.save(any(SignalDashboardEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SignalDashboard saved = signalDashboardService.upsertSignalDashboard("operator", SignalDashboard.builder()
                .dashboardKey("signals-overview")
                .title("Signals overview")
                .layout("[{\"i\":\"metrics-panel\"}]")
                .widgets("[{\"id\":\"metrics-panel\"}]")
                .build());

        assertEquals(3L, saved.getId());
        assertEquals("Signals overview", saved.getTitle());
        assertEquals("[{\"i\":\"metrics-panel\"}]", saved.getLayout());
        assertEquals("v1", saved.getVersion());
        assertEquals("teammate", existing.getCreator());
    }

    @Test
    void upsertSignalDashboardRejectsInvalidKey() {
        SignalDashboard request = SignalDashboard.builder()
                .dashboardKey("bad key")
                .title("Bad")
                .layout("[]")
                .widgets("[]")
                .build();

        assertThrows(IllegalArgumentException.class,
                () -> signalDashboardService.upsertSignalDashboard("operator", request));
    }

    @Test
    void upsertSignalDashboardRejectsMissingLayout() {
        SignalDashboard request = SignalDashboard.builder()
                .dashboardKey("signals-overview")
                .title("Bad")
                .widgets("[]")
                .build();

        assertThrows(IllegalArgumentException.class,
                () -> signalDashboardService.upsertSignalDashboard("operator", request));
    }

    @Test
    void upsertSignalDashboardRejectsMalformedCompositionJson() {
        SignalDashboard request = SignalDashboard.builder()
                .dashboardKey("signals-overview")
                .title("Bad")
                .layout("[{\"i\":\"logs-panel\"")
                .widgets("[{\"id\":\"logs-panel\"}]")
                .variables("[]")
                .panelMap("{}")
                .build();

        assertThrows(IllegalArgumentException.class,
                () -> signalDashboardService.upsertSignalDashboard("operator", request));
    }

    @Test
    void deleteSignalDashboardUsesSharedKey() {
        signalDashboardService.deleteSignalDashboard("operator", "signals-overview");

        verify(signalDashboardDao).deleteByDashboardKey("signals-overview");
    }
}
