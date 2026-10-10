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

package org.apache.hertzbeat.collector.dispatch;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.apache.hertzbeat.common.constants.MetricDataConstants;
import org.apache.hertzbeat.common.entity.metric.NativeMetricSystemContext;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.Test;

class MetricsCollectExecutionContextTest {

    @Test
    void addsCompactExecutionContextToArrowSchemaMetadata() {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder()
                .setId(42L)
                .setApp("linux")
                .setMetrics("cpu")
                .setTime(1_700L)
                .setCode(CollectRep.Code.SUCCESS);
        builder.addMetadata(MetricDataConstants.INSTANCE, "db.internal:3306");
        builder.addMetadata("hertzbeat.workspace.id", "spoof-workspace");
        builder.addMetadata(MetricDataConstants.ENTITY_ID, "999");
        builder.addMetadata("hertzbeat.entity.type", "spoof-type");

        MetricsCollect.addExecutionContext(builder, 1_000L, "collector-arm-1");

        try (CollectRep.MetricsData metricsData = builder.build()) {
            assertEquals("1000", metricsData.getMetadataValue(MetricDataConstants.COLLECTION_STARTED_AT));
            assertEquals("collector-arm-1", metricsData.getMetadataValue(MetricDataConstants.COLLECTOR_ID));
            NativeMetricSystemContext context = NativeMetricSystemContext.from(metricsData);
            assertEquals(42L, context.monitorId());
            assertEquals("collector-arm-1", context.collectorId());
            assertEquals("db.internal:3306", context.instance());
            assertNull(context.workspaceId());
            assertNull(context.entityId());
            assertNull(context.entityType());
        }
    }
}
