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
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.MonitorMetricLayoutEntity;
import org.apache.hertzbeat.manager.dao.MonitorMetricLayoutDao;
import org.apache.hertzbeat.manager.pojo.dto.MonitorMetricHistoryDock;
import org.apache.hertzbeat.manager.pojo.dto.MonitorMetricLayout;
import org.apache.hertzbeat.manager.pojo.dto.MonitorMetricLayoutItem;
import org.apache.hertzbeat.manager.pojo.dto.MonitorMetricLayoutSaveRequest;
import org.apache.hertzbeat.manager.service.MonitorMetricLayoutConflictException;
import org.apache.hertzbeat.manager.service.MonitorMetricLayoutService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link MonitorMetricLayoutServiceImpl}.
 */
@ExtendWith(MockitoExtension.class)
class MonitorMetricLayoutServiceImplTest {

    @Mock
    private MonitorMetricLayoutDao monitorMetricLayoutDao;

    private MonitorMetricLayoutService service;

    @BeforeEach
    void setUp() {
        service = new MonitorMetricLayoutServiceImpl(monitorMetricLayoutDao);
    }

    @Test
    void missingLayoutIsDistinctFromSavedAutomaticLayout() {
        when(monitorMetricLayoutDao.findByCreatorAndApplication("operator", "mysql"))
                .thenReturn(Optional.empty());

        assertEquals(Optional.empty(), service.get("operator", "mysql"));
    }

    @Test
    void firstSaveRequiresMissingRevisionAndStoresOnlyVersionedPresentationIntent() {
        when(monitorMetricLayoutDao.findByCreatorAndApplication("operator", "mysql"))
                .thenReturn(Optional.empty());
        when(monitorMetricLayoutDao.saveAndFlush(any(MonitorMetricLayoutEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        MonitorMetricLayout saved = service.save("operator", "mysql", customRequest("missing"));

        assertEquals("mysql", saved.application());
        assertEquals(1, saved.schemaVersion());
        assertEquals("custom", saved.mode());
        assertNotEquals("missing", saved.revision());
        ArgumentCaptor<MonitorMetricLayoutEntity> captor = ArgumentCaptor.forClass(MonitorMetricLayoutEntity.class);
        verify(monitorMetricLayoutDao).saveAndFlush(captor.capture());
        String document = captor.getValue().getLayoutDocument();
        org.assertj.core.api.Assertions.assertThat(document)
                .contains("basic", "historyDock", "schemaVersion")
                .doesNotContain("password", "jdbc", "favorite", "sample");
    }

    @Test
    void staleUpdateFailsWithoutOverwritingTheOtherTab() {
        MonitorMetricLayoutEntity existing = existing("current-revision");
        when(monitorMetricLayoutDao.findByCreatorAndApplication("operator", "mysql"))
                .thenReturn(Optional.of(existing));

        MonitorMetricLayoutConflictException conflict = assertThrows(
                MonitorMetricLayoutConflictException.class,
                () -> service.save("operator", "mysql", customRequest("stale-revision")));

        assertEquals("monitor_metric_layout_revision_conflict", conflict.getMessage());
        verify(monitorMetricLayoutDao, never()).updateLayoutIfRevision(
                any(), any(), any(), any(), any(), any());
    }

    @Test
    void exactRevisionUsesCompareAndSetAndReturnsTheNewRevision() {
        MonitorMetricLayoutEntity existing = existing("current-revision");
        when(monitorMetricLayoutDao.findByCreatorAndApplication("operator", "mysql"))
                .thenReturn(Optional.of(existing));
        when(monitorMetricLayoutDao.updateLayoutIfRevision(
                eq("operator"), eq("mysql"), any(), eq(1), any(), eq("current-revision")))
                .thenReturn(1);

        MonitorMetricLayout saved = service.save(
                "operator", "mysql", customRequest("current-revision"));

        assertNotEquals("current-revision", saved.revision());
        assertEquals("custom", saved.mode());
    }

    @Test
    void deleteRequiresTheExactRevision() {
        when(monitorMetricLayoutDao.deleteByCreatorAndApplicationAndRevision(
                "operator", "mysql", "current-revision"))
                .thenReturn(0);

        assertThrows(
                MonitorMetricLayoutConflictException.class,
                () -> service.delete("operator", "mysql", "current-revision"));
    }

    @Test
    void invalidOverlappingOrDuplicateGeometryIsRejectedBeforePersistence() {
        MonitorMetricLayoutItem first = new MonitorMetricLayoutItem("basic", 0, 0, 6, 10, false, 0);
        MonitorMetricLayoutItem overlap = new MonitorMetricLayoutItem("status", 4, 0, 6, 10, false, 1);
        MonitorMetricLayoutSaveRequest request = new MonitorMetricLayoutSaveRequest(
                "missing", 1, "custom", 12, List.of(first, overlap),
                new MonitorMetricHistoryDock(false, 12));

        assertThrows(IllegalArgumentException.class, () -> service.save("operator", "mysql", request));
        verify(monitorMetricLayoutDao, never()).findByCreatorAndApplication(any(), any());
    }

    private static MonitorMetricLayoutSaveRequest customRequest(String revision) {
        return new MonitorMetricLayoutSaveRequest(
                revision,
                1,
                "custom",
                12,
                List.of(
                        new MonitorMetricLayoutItem("basic", 0, 0, 6, 10, false, 0),
                        new MonitorMetricLayoutItem("status", 6, 0, 6, 12, false, 1)),
                new MonitorMetricHistoryDock(false, 12));
    }

    private static MonitorMetricLayoutEntity existing(String revision) {
        return MonitorMetricLayoutEntity.builder()
                .id(1L)
                .creator("operator")
                .application("mysql")
                .schemaVersion(1)
                .layoutDocument("{\"schemaVersion\":1,\"mode\":\"auto\",\"columns\":12,"
                        + "\"items\":[],\"historyDock\":{\"collapsed\":false,\"height\":12}}")
                .revision(revision)
                .createTime(LocalDateTime.now().minusMinutes(1))
                .updateTime(LocalDateTime.now())
                .build();
    }
}
