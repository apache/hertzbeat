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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verifyNoInteractions;

import java.util.List;
import java.util.Map;
import java.util.stream.LongStream;
import java.util.stream.Collectors;
import org.apache.hertzbeat.manager.pojo.dto.EntitySummaryInfo;
import org.apache.hertzbeat.manager.pojo.dto.EntityInfo;
import org.apache.hertzbeat.observability.shared.query.ObservabilityQueryRequestException;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;
import org.apache.hertzbeat.warehouse.repository.ApmRedQueryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
class EntityServicePerformanceReadModelServiceTest {
    @Mock private EntityCatalogQueryService catalog;
    @Mock private EntityWorkspaceAccessService access;
    @Mock private EntityIdentityQueryService identities;
    @Mock private EntityListReadModelService summaries;
    @Mock private ObjectProvider<ApmRedQueryRepository> repositories;
    @Mock private ApmRedQueryRepository repository;
    @InjectMocks private EntityServicePerformanceReadModelService service;

    @Test
    void rejectsOverLimitBeforeIdentityOrWarehouseReads() {
        when(access.currentRequestWorkspaceId()).thenReturn("team-a");
        when(catalog.findEntityPage(isNull(), eq("service"), isNull(), isNull(), isNull(), isNull(), isNull(),
                isNull(), isNull(), isNull(), eq("id"), eq("asc"), eq(0), eq(501), eq("team-a")))
                .thenReturn(new PageImpl<>(List.of(entity(1)), PageRequest.of(0, 501), 501));
        var result = service.query(null, null, 1000, 61000, "errorCount", "desc", 0, 10);
        assertEquals("scope_too_large", result.state());
        assertEquals(501, result.totalElements());
        assertEquals(List.of(), result.content());
        verifyNoInteractions(identities, repositories, summaries);
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 50, 500})
    void ranksWholeCandidateSetBeforePagingWithConstantBatchCalls(int count) {
        var entities = LongStream.rangeClosed(1, count).mapToObj(this::entity).toList();
        var values = entities.stream().collect(Collectors.toMap(row -> row.getId().toString(),
                row -> red(row.getId(), 10D)));
        prepare(entities, values);
        var result = service.query(null, null, 1000, 61000, "errorCount", "desc", 0, 10);
        assertEquals("ready", result.state());
        assertEquals(count, result.totalElements());
        assertEquals((long) count, result.content().getFirst().entity().getEntity().getId());
        verify(identities, times(1)).findIdentities(eq("team-a"), any(java.util.Set.class));
        verify(repository, times(1)).querySummaries(anyList());
        verify(summaries, times(1)).summarizeEntities(eq(entities.reversed().subList(0, Math.min(count, 10))), eq("team-a"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"asc", "desc"})
    void keepsUnknownLatencyLastAndUsesIdForTies(String order) {
        prepare(List.of(entity(4), entity(3), entity(2), entity(1)),
                Map.of("1", red(0, null), "2", red(0, 10D), "3", red(0, 10D)));
        var result = service.query(null, null, 1000, 61000, "latencyP95Ms", order, 0, 10);
        assertEquals(List.of(2L, 3L, 1L, 4L), result.content().stream().map(row -> row.entity().getEntity().getId()).toList());
        assertEquals("empty", result.content().getLast().state());
        assertNull(result.content().getLast().summary());
    }

    @Test
    void storageFailureDoesNotProduceRankedOrZeroFilledRows() {
        prepare(List.of(entity(1)), Map.of());
        when(repository.querySummaries(anyList())).thenReturn(new ApmRedQueryRepository.ApmRedBatchResult(false, Map.of()));
        var result = service.query(null, null, 1000, 61000, "errorCount", "desc", 0, 10);
        assertEquals("unavailable", result.state());
        assertNull(result.totalElements());
        assertEquals(List.of(), result.content());
        verifyNoInteractions(summaries);
    }

    @Test
    void missingWorkspaceFailsClosedBeforeAnyRead() {
        assertThrows(ObservabilityQueryRequestException.class,
                () -> service.query(null, null, 1000, 61000, "errorCount", "desc", 0, 10));
        verifyNoInteractions(catalog, identities, repositories, summaries);
    }

    @Test
    void emptyCandidateScopeSkipsIdentityAndWarehouse() {
        when(access.currentRequestWorkspaceId()).thenReturn("team-a");
        candidatePage(List.of(), 0);
        var result = service.query(null, null, 1000, 61000, "errorCount", "desc", 0, 10);
        assertEquals("ready", result.state());
        assertEquals(0, result.totalElements());
        verifyNoInteractions(identities, repositories, summaries);
    }

    @ParameterizedTest
    @MethodSource("invalidSummaries")
    void invalidAggregateFailsEvenWhenSortingByName(ApmRedQueryRepository.ApmRedSummary invalid) {
        prepare(List.of(entity(1)), Map.of("1", invalid));
        var result = service.query(null, null, 1000, 61000, "name", "asc", 0, 10);
        assertEquals("unavailable", result.state());
        assertNull(result.totalElements());
        assertEquals(List.of(), result.content());
        verifyNoInteractions(summaries);
    }

    private static List<ApmRedQueryRepository.ApmRedSummary> invalidSummaries() {
        return List.of(
                new ApmRedQueryRepository.ApmRedSummary(0, 0, 0, 0, null, null),
                new ApmRedQueryRepository.ApmRedSummary(-1, 0, 0, 0, null, null),
                new ApmRedQueryRepository.ApmRedSummary(10, -1, 1, 0, null, null),
                new ApmRedQueryRepository.ApmRedSummary(10, 11, 1, 0, null, null),
                new ApmRedQueryRepository.ApmRedSummary(10, 1, Double.NaN, 0.1, 2D, 3D),
                new ApmRedQueryRepository.ApmRedSummary(10, 1, -1, 0.1, 2D, 3D),
                new ApmRedQueryRepository.ApmRedSummary(10, 1, 1, Double.POSITIVE_INFINITY, 2D, 3D),
                new ApmRedQueryRepository.ApmRedSummary(10, 1, 1, -0.1, 2D, 3D),
                new ApmRedQueryRepository.ApmRedSummary(10, 1, 1, 1.1, 2D, 3D),
                new ApmRedQueryRepository.ApmRedSummary(10, 1, 1, 0.1, -2D, 3D),
                new ApmRedQueryRepository.ApmRedSummary(10, 1, 1, 0.1, 2D, Double.NaN));
    }

    @Test
    void foreignWorkspaceCandidateFailsBeforeIdentityReads() {
        when(access.currentRequestWorkspaceId()).thenReturn("team-a");
        var foreign = entity(1);
        foreign.setWorkspaceId("team-b");
        candidatePage(List.of(foreign), 1);
        assertEquals("unavailable", service.query(null, null, 1000, 61000, "name", "asc", 0, 10).state());
        verifyNoInteractions(identities, repositories, summaries);
    }

    @Test
    void secondPageUsesGlobalRanking() {
        var entities = LongStream.rangeClosed(1, 25).mapToObj(this::entity).toList();
        prepare(entities, entities.stream().collect(Collectors.toMap(row -> row.getId().toString(), row -> red(row.getId(), 10D))));
        var result = service.query(null, null, 1000, 61000, "errorCount", "desc", 1, 10);
        assertEquals(List.of(15L, 14L, 13L, 12L, 11L, 10L, 9L, 8L, 7L, 6L),
                result.content().stream().map(row -> row.entity().getEntity().getId()).toList());
        verify(summaries).summarizeEntities(eq(entities.reversed().subList(10, 20)), eq("team-a"));
    }

    private void prepare(List<ObserveEntity> entities, Map<String, ApmRedQueryRepository.ApmRedSummary> values) {
        when(access.currentRequestWorkspaceId()).thenReturn("team-a");
        candidatePage(entities, entities.size());
        when(identities.findIdentities(eq("team-a"), any(java.util.Set.class))).thenReturn(List.of());
        when(repositories.getIfAvailable()).thenReturn(repository);
        when(repository.querySummaries(anyList())).thenReturn(new ApmRedQueryRepository.ApmRedBatchResult(true, values));
        lenient().when(summaries.summarizeEntities(anyList(), eq("team-a"))).thenAnswer(call -> {
            List<ObserveEntity> selected = call.getArgument(0);
            return selected.stream().map(row -> {
                EntitySummaryInfo summary = new EntitySummaryInfo();
                summary.setEntity(EntityInfo.fromEntity(row));
                return summary;
            }).toList();
        });
    }

    private void candidatePage(List<ObserveEntity> entities, long total) {
        when(catalog.findEntityPage(isNull(), eq("service"), isNull(), isNull(), isNull(), isNull(), isNull(),
                isNull(), isNull(), isNull(), eq("id"), eq("asc"), eq(0), eq(501), eq("team-a")))
                .thenReturn(new PageImpl<>(entities, PageRequest.of(0, 501), total));
    }

    private ApmRedQueryRepository.ApmRedSummary red(long errors, Double p95) {
        return new ApmRedQueryRepository.ApmRedSummary(1000, errors, 1000D / 60, errors / 1000D, 2D, p95);
    }

    private ObserveEntity entity(long id) {
        ObserveEntity entity = new ObserveEntity();
        entity.setId(id);
        entity.setType("service");
        entity.setName("checkout");
        entity.setWorkspaceId("team-a");
        return entity;
    }
}
