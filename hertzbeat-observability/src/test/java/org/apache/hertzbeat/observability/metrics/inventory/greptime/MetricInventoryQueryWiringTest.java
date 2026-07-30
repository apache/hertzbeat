/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.metrics.inventory.greptime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQueryData;
import org.apache.hertzbeat.common.observability.dto.metrics.OtlpMetricsConsoleDto;
import org.apache.hertzbeat.common.observability.gateway.ObservabilitySignalIntakeGateway;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityWorkspaceQueryGateway;
import org.apache.hertzbeat.observability.ingestion.service.impl.OtlpIngestionWorkspaceServiceImpl;
import org.apache.hertzbeat.observability.metrics.inventory.MetricInventoryRepository;
import org.apache.hertzbeat.observability.traces.service.EntityTraceQueryService;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.apache.hertzbeat.warehouse.repository.LogQueryRepository;
import org.apache.hertzbeat.warehouse.repository.MetricQueryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class MetricInventoryQueryWiringTest {

    @Test
    void wiresPersistentInventoryIntoExactPromqlWithoutRecentMemory() {
        GreptimeSqlQueryExecutor sqlExecutor = mock(GreptimeSqlQueryExecutor.class);
        MetricQueryRepository metricQueryRepository = mock(MetricQueryRepository.class);
        @SuppressWarnings("unchecked")
        ObjectProvider<GreptimeSqlQueryExecutor> executorProvider = mock(ObjectProvider.class);
        when(executorProvider.getIfAvailable()).thenReturn(sqlExecutor);
        GreptimeMetricInventoryRepository inventoryRepository =
                new GreptimeMetricInventoryRepository(executorProvider);
        when(sqlExecutor.executeStrict(anyString())).thenReturn(
                List.of(Map.of("table_name", "orders_processed_total_20260730")));
        when(metricQueryRepository.hasPromqlExecutor()).thenReturn(true);
        when(metricQueryRepository.queryPromqlRange(
                eq("otlp-metrics-console"), anyString(), eq(1_000L), eq(2_000L), anyString()))
                .thenReturn(new MetricQueryRepository.PromqlRangeQueryResult(
                        "Greptime-promql", metricData(), null));
        AtomicReference<OtlpMetricsConsoleDto> consoleReference = new AtomicReference<>();

        // This is a Spring wiring and persistence-boundary contract, not a JVM restart proof.
        new ApplicationContextRunner()
                .withBean(EntityTraceQueryService.class, () -> mock(EntityTraceQueryService.class))
                .withBean(ObservabilityWorkspaceQueryGateway.class,
                        () -> mock(ObservabilityWorkspaceQueryGateway.class))
                .withBean("telemetryIntakeServiceImpl", ObservabilitySignalIntakeGateway.class,
                        () -> mock(ObservabilitySignalIntakeGateway.class))
                .withBean(LogQueryRepository.class, () -> mock(LogQueryRepository.class))
                .withBean(MetricQueryRepository.class, () -> metricQueryRepository)
                .withBean(GreptimeSqlQueryExecutor.class, () -> sqlExecutor)
                .withBean("greptimeMetricInventoryRepository", MetricInventoryRepository.class,
                        () -> inventoryRepository)
                .withBean(OtlpIngestionWorkspaceServiceImpl.class)
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).hasSingleBean(MetricInventoryRepository.class);
                    assertThat(context.getBean(MetricInventoryRepository.class))
                            .isInstanceOf(GreptimeMetricInventoryRepository.class);
                    consoleReference.set(context.getBean(OtlpIngestionWorkspaceServiceImpl.class)
                            .getMetricsConsole(
                                    null, null, 1_000L, 2_000L, "checkout", "commerce", "prod",
                                    "collector-east", "checkout-01", "/orders", null, null, null, null,
                                    null, null, null, null));
                });

        verify(sqlExecutor).executeStrict(argThat(sql ->
                sql.contains("p.service_name = 'checkout'")
                        && sql.contains("p.service_namespace = 'commerce'")
                        && sql.contains("p.deployment_environment_name = 'prod'")
                        && sql.contains("p.hertzbeat_collector_id = 'collector-east'")
                        && sql.contains("p.service_instance_id = 'checkout-01'")
                        && sql.contains("p.http_route = '/orders'")));
        verify(metricQueryRepository).queryPromqlRange(
                eq("otlp-metrics-console"),
                argThat(query -> query.contains("__name__=\"orders_processed_total_20260730\"")
                        && query.contains("hertzbeat_collector_id=\"collector-east\"")
                        && query.contains("service_instance_id=\"checkout-01\"")
                        && query.contains("http_route=\"/orders\"")),
                eq(1_000L),
                eq(2_000L),
                anyString());
        OtlpMetricsConsoleDto console = consoleReference.get();
        assertThat(console.getQuery())
                .isNotNull()
                .contains("__name__=\"orders_processed_total_20260730\"")
                .contains("hertzbeat_collector_id=\"collector-east\"")
                .contains("service_instance_id=\"checkout-01\"")
                .contains("http_route=\"/orders\"");
        assertThat(console.getStats().getNonEmptySeries()).isPositive();
    }

    private static DatasourceQueryData metricData() {
        return new DatasourceQueryData(
                "otlp-metrics-console",
                200,
                null,
                List.of(new DatasourceQueryData.SchemaData(
                        new DatasourceQueryData.MetricSchema(
                                List.of(
                                        new DatasourceQueryData.MetricField("__ts__", "time", null),
                                        new DatasourceQueryData.MetricField("__value__", "number", null)),
                                Map.of("__name__", "orders_processed_total_20260730"),
                                Map.of()),
                        Collections.singletonList(new Object[] {1_500L, 7.0}))));
    }
}
