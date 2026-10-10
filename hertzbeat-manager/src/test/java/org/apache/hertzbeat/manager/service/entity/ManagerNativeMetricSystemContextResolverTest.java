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

package org.apache.hertzbeat.manager.service.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.common.entity.metric.NativeMetricSystemContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ManagerNativeMetricSystemContextResolverTest {

    private EntityMonitorBindQueryService bindQueryService;
    private EntityWorkspaceQueryService entityQueryService;
    private ManagerNativeMetricSystemContextResolver resolver;

    @BeforeEach
    void setUp() {
        bindQueryService = mock(EntityMonitorBindQueryService.class);
        entityQueryService = mock(EntityWorkspaceQueryService.class);
        resolver = new ManagerNativeMetricSystemContextResolver(bindQueryService, entityQueryService);
    }

    @Test
    void enrichesCollectorContextFromSingleActiveEntityAuthority() {
        NativeMetricSystemContext intrinsic = new NativeMetricSystemContext(
                null, null, null, 42L, "collector-arm-1", "db.internal:3306");
        when(bindQueryService.findMonitorBindsByMonitorId(42L)).thenReturn(List.of(
                EntityMonitorBind.builder()
                        .monitorId(42L)
                        .entityId(99L)
                        .status("active")
                        .build()));
        when(entityQueryService.findEntityById(99L)).thenReturn(Optional.of(
                ObserveEntity.builder()
                        .id(99L)
                        .workspaceId("team-a")
                        .type("database")
                        .build()));

        NativeMetricSystemContext result = resolver.resolve(null, intrinsic);

        assertEquals("team-a", result.workspaceId());
        assertEquals(99L, result.entityId());
        assertEquals("database", result.entityType());
        assertEquals(42L, result.monitorId());
        assertEquals("collector-arm-1", result.collectorId());
        assertEquals("db.internal:3306", result.instance());

        assertEquals(result, resolver.resolve(null, intrinsic));
        verify(bindQueryService, times(1)).findMonitorBindsByMonitorId(42L);
        verify(entityQueryService, times(1)).findEntityById(99L);
    }

    @Test
    void ignoresInactiveHistoryWhenResolvingSingleActiveEntityAuthority() {
        NativeMetricSystemContext intrinsic = new NativeMetricSystemContext(
                null, null, null, 42L, "collector-arm-1", "db.internal:3306");
        when(bindQueryService.findMonitorBindsByMonitorId(42L)).thenReturn(List.of(
                EntityMonitorBind.builder().monitorId(42L).entityId(98L).status("inactive").build(),
                EntityMonitorBind.builder().monitorId(42L).entityId(99L).status("active").build()));
        when(entityQueryService.findEntityById(99L)).thenReturn(Optional.of(
                ObserveEntity.builder()
                        .id(99L)
                        .workspaceId("team-a")
                        .type("database")
                        .build()));

        NativeMetricSystemContext result = resolver.resolve(null, intrinsic);

        assertEquals("team-a", result.workspaceId());
        assertEquals(99L, result.entityId());
        assertEquals("database", result.entityType());
        assertEquals(42L, result.monitorId());
        assertEquals("collector-arm-1", result.collectorId());
        assertEquals("db.internal:3306", result.instance());
        verify(entityQueryService).findEntityById(99L);
    }

    @Test
    void cachesAbsentAuthorityWhenBindingQueryFails() {
        NativeMetricSystemContext intrinsic = new NativeMetricSystemContext(
                null, null, null, 42L, "collector-arm-1", "db.internal:3306");
        when(bindQueryService.findMonitorBindsByMonitorId(42L))
                .thenThrow(new IllegalStateException("metadata unavailable"));

        assertEquals(intrinsic, resolver.resolve(null, intrinsic));
        assertEquals(intrinsic, resolver.resolve(null, intrinsic));
        verify(bindQueryService, times(1)).findMonitorBindsByMonitorId(42L);
    }

    @Test
    void leavesOptionalEntityAuthorityAbsentWhenBindingIsAmbiguous() {
        NativeMetricSystemContext intrinsic = new NativeMetricSystemContext(
                null, null, null, 42L, null, "db.internal:3306");
        when(bindQueryService.findMonitorBindsByMonitorId(42L)).thenReturn(List.of(
                EntityMonitorBind.builder().monitorId(42L).entityId(99L).status("active").build(),
                EntityMonitorBind.builder().monitorId(42L).entityId(100L).status("active").build()));

        NativeMetricSystemContext result = resolver.resolve(null, intrinsic);

        assertNull(result.workspaceId());
        assertNull(result.entityId());
        assertNull(result.entityType());
        assertNull(result.collectorId());
        assertEquals(42L, result.monitorId());
    }
}
