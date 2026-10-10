/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.logs.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.observability.dto.log.LogGroupSelection;
import org.apache.hertzbeat.common.observability.dto.log.PreparedLogGroupSelection;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.apache.hertzbeat.observability.logs.query.LogFilterQueryException;
import org.apache.hertzbeat.observability.logs.sse.LogSseFilterCriteria;
import org.apache.hertzbeat.observability.logs.sse.LogSseManager;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.apache.hertzbeat.warehouse.store.history.tsdb.HistoryDataReader;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@ExtendWith(MockitoExtension.class)
class LogSseServiceImplTest {

    @Mock
    private LogSseManager emitterManager;

    @AfterEach
    void tearDown() {
        AuthTokenRequestContext.clear();
    }

    @Test
    void subscribeBindsAuthenticatedWorkspaceInsteadOfClientValue() {
        AuthTokenRequestContext.bindAuthenticatedWorkspaceId("team-a");
        LogSseFilterCriteria criteria = new LogSseFilterCriteria();
        criteria.setWorkspaceId("client-controlled");
        when(emitterManager.createPreparedEmitter(anyLong(), any()))
                .thenReturn(new SseEmitter());

        service().subscribe(criteria);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Predicate<LogEntry>> captor = ArgumentCaptor.forClass(Predicate.class);
        verify(emitterManager).createPreparedEmitter(anyLong(), captor.capture());
        assertEquals("team-a", criteria.getWorkspaceId());
        criteria.setWorkspaceId("changed");
        assertTrue(captor.getValue().test(LogEntry.builder()
                .resource(Map.of("hertzbeat.workspace_id", "team-a")).build()));
    }

    @Test
    void subscribeRejectsMissingAuthenticatedWorkspaceBeforeCreatingEmitter() {
        LogSseFilterCriteria criteria = new LogSseFilterCriteria();
        criteria.setWorkspaceId("client-controlled");

        assertThrows(IllegalArgumentException.class,
                () -> service().subscribe(criteria));

        verify(emitterManager, never()).createPreparedEmitter(anyLong(), any());
    }

    @Test
    void selectorPreparationIsOncePerOperationAndNoSelectorAvoidsReader() {
        AuthTokenRequestContext.bindAuthenticatedWorkspaceId("team-a");
        var reader = mock(HistoryDataReader.class);
        var service = new LogSseServiceImpl(emitterManager, List.of(reader),
                new ObservabilityQueryAdmissionService(1, 1, 1, 1, 0, Duration.ZERO));
        service.validate(new LogSseFilterCriteria());
        verifyNoInteractions(reader, emitterManager);
        var criteria = new LogSseFilterCriteria();
        criteria.setLogGroupSelection("{\"version\":1,\"groups\":[{\"field\":\"attribute:x\",\"kind\":\"value\",\"value\":\"2\"}]}");
        when(reader.prepareLogGroupSelection(eq("team-a"), any()))
                .thenAnswer(invocation -> {
                    var selection = (LogGroupSelection) invocation.getArgument(1);
                    return new PreparedLogGroupSelection(selection,
                            List.of(new PreparedLogGroupSelection.Target(selection.groups().getFirst(), 2L, null)));
                });
        service.validate(criteria);
        verifyNoInteractions(emitterManager);
        service.subscribe(criteria);
        verify(reader, times(2)).prepareLogGroupSelection(eq("team-a"), any());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Predicate<LogEntry>> captured = ArgumentCaptor.forClass(Predicate.class);
        verify(emitterManager).createPreparedEmitter(anyLong(), captured.capture());
        criteria.setLogGroupSelection(null);
        criteria.setWorkspaceId("different");
        for (int index = 0; index < 100; index++) {
            assertTrue(captured.getValue().test(LogEntry.builder().attributes(Map.of("x", 2L))
                    .resource(Map.of("hertzbeat.workspace_id", "team-a")).build()));
            org.junit.jupiter.api.Assertions.assertFalse(captured.getValue().test(LogEntry.builder().attributes(Map.of("x", 2.0))
                    .resource(Map.of("hertzbeat.workspace_id", "team-a")).build()));
            org.junit.jupiter.api.Assertions.assertFalse(captured.getValue().test(LogEntry.builder().attributes(Map.of("x", 2L))
                    .resource(Map.of("hertzbeat.workspace_id", "different")).build()));
        }
        verify(reader, times(2)).prepareLogGroupSelection(eq("team-a"), any());
    }

    @Test
    void failedOrUnsupportedPreparationCannotCreateEmitter() {
        AuthTokenRequestContext.bindAuthenticatedWorkspaceId("team-a");
        var criteria = new LogSseFilterCriteria();
        criteria.setLogGroupSelection("{\"version\":1,\"groups\":[{\"field\":\"attribute:x\",\"kind\":\"missing\"}]}");
        assertThrows(LogFilterQueryException.class, () -> service().subscribe(criteria));
        var reader = mock(HistoryDataReader.class);
        var service = new LogSseServiceImpl(emitterManager, List.of(reader),
                new ObservabilityQueryAdmissionService(1, 1, 1, 1, 0, Duration.ZERO));
        assertThrows(TelemetryStorageUnavailableException.class, () -> service.subscribe(criteria));
        verifyNoInteractions(emitterManager);
    }

    private LogSseServiceImpl service() {
        return new LogSseServiceImpl(emitterManager, List.of(),
                new ObservabilityQueryAdmissionService(8, 8, 8, 4, 8, Duration.ofMillis(100)));
    }
}
