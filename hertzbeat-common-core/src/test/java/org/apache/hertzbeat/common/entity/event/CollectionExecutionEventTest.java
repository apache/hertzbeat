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

package org.apache.hertzbeat.common.entity.event;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.apache.hertzbeat.common.constants.MetricDataConstants;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.Test;

class CollectionExecutionEventTest {

    @Test
    void createsBoundedSemanticSummaryWithoutCopyingRows() {
        try (CollectRep.MetricsData metricsData = CollectRep.MetricsData.newBuilder()
                .setId(42L)
                .setApp("mysql")
                .setMetrics("availability")
                .setTime(1_700L)
                .setCode(CollectRep.Code.TIMEOUT)
                .addMetadata(MetricDataConstants.COLLECTION_STARTED_AT, "1000")
                .addMetadata(MetricDataConstants.COLLECTOR_ID, "collector-arm-1")
                .addMetadata(MetricDataConstants.COLLECTION_PHASE, "connect")
                .addMetadata(MetricDataConstants.ENTITY_ID, "99")
                .addMetadata(MetricDataConstants.INSTANCE, "db.internal:3306")
                .addField(CollectRep.Field.newBuilder().setName("response_time").setType(1).build())
                .addValueRow(CollectRep.ValueRow.newBuilder().addColumn("700").build())
                .build()) {
            CollectionExecutionEvent event = CollectionExecutionEvent.from(metricsData);

            assertEquals(42L, event.entity().monitorId());
            assertEquals(99L, event.entity().entityId());
            assertEquals("mysql", event.entity().app());
            assertEquals("collector-arm-1", event.runtime().collectorId());
            assertEquals("db.internal:3306", event.runtime().target());
            assertEquals("availability", event.observation().metricSet());
            assertEquals(1_700L, event.observation().observedAt());
            assertEquals(700L, event.observation().durationMillis());
            assertEquals(CollectionExecutionEvent.Outcome.FAILURE, event.observation().outcome());
            assertEquals(CollectionExecutionEvent.FailureClass.TIMEOUT, event.observation().failureClass());
            assertEquals(CollectionExecutionEvent.CollectionPhase.CONNECT, event.observation().phase());
            assertEquals(1, event.observation().fieldCount());
            assertEquals(1, event.observation().rowCount());
        }
    }

    @Test
    void runtimeAndEntityResolutionRemainOptional() {
        try (CollectRep.MetricsData metricsData = CollectRep.MetricsData.newBuilder()
                .setId(7L)
                .setApp("linux")
                .setMetrics("cpu")
                .setTime(2_000L)
                .setCode(CollectRep.Code.SUCCESS)
                .build()) {
            CollectionExecutionEvent event = CollectionExecutionEvent.from(metricsData);

            assertNull(event.entity().entityId());
            assertNull(event.runtime());
            assertEquals(CollectionExecutionEvent.UNKNOWN_DURATION_MILLIS,
                    event.observation().durationMillis());
            assertEquals(CollectionExecutionEvent.Outcome.SUCCESS, event.observation().outcome());
            assertEquals(CollectionExecutionEvent.FailureClass.NONE, event.observation().failureClass());
            assertEquals(CollectionExecutionEvent.CollectionPhase.UNKNOWN, event.observation().phase());
        }
    }
}
