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

package org.apache.hertzbeat.warehouse.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.IntStream;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.apache.hertzbeat.warehouse.repository.SemanticGraphQueryRepository.EntityKey;
import org.apache.hertzbeat.warehouse.repository.SemanticGraphQueryRepository.RelationshipQuery;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

@ExtendWith(MockitoExtension.class)
class GreptimeSemanticGraphQueryRepositoryTest {

    private static final long NOW = 1_770_000_000_000L;

    @Mock
    private ObjectProvider<GreptimeSqlQueryExecutor> executorProvider;

    @Mock
    private GreptimeSqlQueryExecutor executor;

    private GreptimeSemanticGraphQueryRepository repository;

    @BeforeEach
    void setUp() {
        repository = new GreptimeSemanticGraphQueryRepository(
                executorProvider,
                Clock.fixed(Instant.ofEpochMilli(NOW), ZoneOffset.UTC),
                Duration.ofMinutes(10));
    }

    @Test
    void readsOnlyBoundedAdjacentRelationshipsAndEscapesEntityValues() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString()))
                .thenReturn(List.of(Map.of("table_name", "semantic_relationships")))
                .thenReturn(List.of(Map.ofEntries(
                        Map.entry("observed_at", "2026-02-02T02:40:00Z"),
                        Map.entry("src_type", "service"),
                        Map.entry("src_id", "check'out"),
                        Map.entry("dst_type", "service"),
                        Map.entry("dst_id", "payment"),
                        Map.entry("rel_type", "calls"),
                        Map.entry("provenance", "trace"),
                        Map.entry("confidence", 1.0D),
                        Map.entry("request_count", 42L),
                        Map.entry("error_count", 2L),
                        Map.entry("duration_sum", 12.5D),
                        Map.entry("duration_count", 42L))));

        var result = repository.queryRelationships(new RelationshipQuery(
                Set.of(new EntityKey("service", "check'out")), NOW - 900_000L, NOW, 64));

        assertTrue(result.available());
        assertEquals(1, result.relationships().size());
        assertEquals("payment", result.relationships().getFirst().target().id());
        assertEquals(42L, result.relationships().getFirst().requestCount());

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(executor, times(2)).executeStrict(sql.capture());
        String relationshipSql = sql.getAllValues().get(1);
        assertTrue(relationshipSql.contains("observed_at >= to_timestamp_millis(" + (NOW - 900_000L) + ")"));
        assertTrue(relationshipSql.contains("observed_at <= to_timestamp_millis(" + NOW + ")"));
        assertTrue(relationshipSql.contains("src_id = 'check''out'"));
        assertTrue(relationshipSql.contains("dst_id = 'check''out'"));
        assertTrue(relationshipSql.endsWith("ORDER BY observed_at DESC LIMIT 64"));
    }

    @Test
    void cachesUnsupportedCapabilityWithoutQueryingTheComputedGraph() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of());
        RelationshipQuery query = new RelationshipQuery(
                Set.of(new EntityKey("service", "checkout")), NOW - 900_000L, NOW, 32);

        var first = repository.queryRelationships(query);
        var second = repository.queryRelationships(query);

        assertFalse(first.available());
        assertFalse(second.available());
        assertTrue(first.relationships().isEmpty());
        verify(executor, times(1)).executeStrict(anyString());
    }

    @Test
    void probesUnsupportedCapabilityOnlyOnceUnderConcurrentLoad() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of());
        RelationshipQuery query = new RelationshipQuery(
                Set.of(new EntityKey("service", "checkout")), NOW - 900_000L, NOW, 32);

        IntStream.range(0, 32).parallel()
                .mapToObj(ignored -> repository.queryRelationships(query))
                .forEach(result -> assertFalse(result.available()));

        verify(executor, times(1)).executeStrict(anyString());
    }

    @Test
    void greptimeEnabledContextWiresTheRepositoryConstructor() {
        new ApplicationContextRunner()
                .withPropertyValues("warehouse.store.greptime.enabled=true")
                .withBean(GreptimeSqlQueryExecutor.class, () -> executor)
                .withBean(GreptimeSemanticGraphQueryRepository.class)
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).hasSingleBean(GreptimeSemanticGraphQueryRepository.class);
                });
    }
}
