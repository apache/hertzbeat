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

import static org.apache.hertzbeat.observability.metrics.inventory.MetricInventoryRepository.Status.FAILURE;
import static org.apache.hertzbeat.observability.metrics.inventory.MetricInventoryRepository.Status.SUCCESS;
import static org.apache.hertzbeat.observability.metrics.inventory.MetricInventoryRepository.Status.UNSUPPORTED;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.observability.metrics.inventory.MetricInventoryRepository;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;

@ExtendWith(MockitoExtension.class)
class GreptimeMetricInventoryRepositoryTest {

    @Mock
    private ObjectProvider<GreptimeSqlQueryExecutor> executorProvider;

    @Mock
    private GreptimeSqlQueryExecutor executor;

    private GreptimeMetricInventoryRepository repository;

    @BeforeEach
    void setUp() {
        repository = new GreptimeMetricInventoryRepository(executorProvider);
    }

    @Test
    void discoversArbitraryMetricNamesWithTheCompleteEscapedScopeAndBoundedLimit() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of(
                Map.of("table_name", "orders_processed_total_20260730"),
                Map.of("table_name", "other_metric")
        ));

        MetricInventoryRepository.Result result = repository.findMetricNames(query(
                "checkout's-api", "commerce's", "prod's", "collector's",
                "checkout's-7d9", "/checkout/{id}'s", 7));

        assertEquals(SUCCESS, result.status());
        assertEquals(List.of("orders_processed_total_20260730", "other_metric"), result.names());
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(executor).executeStrict(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();
        assertTrue(sql.contains("FROM greptime_physical_table AS p"));
        assertTrue(sql.contains("JOIN information_schema.tables AS t"));
        assertTrue(sql.contains("p.__table_id = t.table_id"));
        assertTrue(sql.contains("p.service_name = 'checkout''s-api'"));
        assertTrue(sql.contains("p.service_namespace = 'commerce''s'"));
        assertTrue(sql.contains("p.deployment_environment_name = 'prod''s'"));
        assertTrue(sql.contains("p.hertzbeat_collector_id = 'collector''s'"));
        assertTrue(sql.contains("p.service_instance_id = 'checkout''s-7d9'"));
        assertTrue(sql.contains("p.http_route = '/checkout/{id}''s'"));
        assertTrue(sql.contains("p.greptime_timestamp >= to_timestamp_millis(1000)"));
        assertTrue(sql.contains("p.greptime_timestamp < to_timestamp_millis(2001)"));
        assertTrue(sql.endsWith("LIMIT 7"));
        assertFalse(sql.contains("__name__=~"));
    }

    @Test
    void keepsSuccessEmptyDistinctFromFailureAndUnsupported() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of());
        assertEquals(SUCCESS, repository.findMetricNames(query(
                "checkout", "commerce", "prod", "collector-a", "instance-a", "/checkout", 20)).status());

        String secretSentinel = "SELECT secret WHERE endpoint='/private'";
        when(executor.executeStrict(anyString())).thenThrow(new IllegalStateException(secretSentinel));
        Logger logger = (Logger) LoggerFactory.getLogger(GreptimeMetricInventoryRepository.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        MetricInventoryRepository.Result failure;
        try {
            failure = repository.findMetricNames(query(
                    "checkout", "commerce", "prod", "collector-a", "instance-a", "/checkout", 20));
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
        assertEquals(FAILURE, failure.status());
        assertEquals("metric_inventory_unavailable", failure.errorMessage());
        assertEquals(1, appender.list.size());
        ILoggingEvent event = appender.list.getFirst();
        assertEquals("metric_inventory_unavailable: IllegalStateException", event.getFormattedMessage());
        assertFalse(event.getFormattedMessage().contains(secretSentinel));
        assertEquals(null, event.getThrowableProxy());

        when(executorProvider.getIfAvailable()).thenReturn(null);
        assertEquals(UNSUPPORTED, repository.findMetricNames(query(
                "checkout", "commerce", "prod", "collector-a", "instance-a", "/checkout", 20)).status());
    }

    @Test
    void rejectsIncompleteScopeInsteadOfRunningBroaderQuery() {
        MetricInventoryRepository.Result result = repository.findMetricNames(query(
                "checkout", null, "prod", "collector-a", "instance-a", "/checkout", 20));

        assertEquals(UNSUPPORTED, result.status());
        verify(executor, never()).executeStrict(anyString());
    }

    @Test
    void omitsUnspecifiedOptionalDimensionsInsteadOfTreatingThemAsNullLabels() {
        when(executorProvider.getIfAvailable()).thenReturn(executor);
        when(executor.executeStrict(anyString())).thenReturn(List.of());

        assertEquals(SUCCESS, repository.findMetricNames(query(
                "checkout", "commerce", "prod", null, null, null, 20)).status());

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(executor).executeStrict(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();
        assertFalse(sql.contains("hertzbeat_collector_id"));
        assertFalse(sql.contains("service_instance_id"));
        assertFalse(sql.contains("http_route"));
        assertFalse(sql.contains("IS NULL"));
    }

    @Test
    void directResultConstructionEnforcesEveryStatusInvariant() {
        List<String> mutableNames = new ArrayList<>(List.of("orders_processed_total"));
        MetricInventoryRepository.Result success =
                new MetricInventoryRepository.Result(SUCCESS, mutableNames, "raw error");
        mutableNames.add("late_mutation");
        assertEquals(List.of("orders_processed_total"), success.names());
        assertNull(success.errorMessage());

        MetricInventoryRepository.Result emptySuccess =
                new MetricInventoryRepository.Result(SUCCESS, null, "raw error");
        assertEquals(List.of(), emptySuccess.names());
        assertNull(emptySuccess.errorMessage());

        MetricInventoryRepository.Result unsupported =
                new MetricInventoryRepository.Result(UNSUPPORTED, List.of("leaked_metric"), "raw error");
        assertEquals(List.of(), unsupported.names());
        assertNull(unsupported.errorMessage());

        MetricInventoryRepository.Result failure =
                new MetricInventoryRepository.Result(FAILURE, List.of("leaked_metric"), "SELECT secret");
        assertEquals(List.of(), failure.names());
        assertEquals("metric_inventory_unavailable", failure.errorMessage());

        assertThrows(NullPointerException.class, () ->
                new MetricInventoryRepository.Result(null, List.of("leaked_metric"), "raw error"));
    }

    private MetricInventoryRepository.Query query(
            String serviceName,
            String namespace,
            String environment,
            String collectorId,
            String instance,
            String endpoint,
            int limit) {
        return new MetricInventoryRepository.Query(
                serviceName, namespace, environment, collectorId, instance, endpoint, 1000L, 2000L, limit);
    }
}
