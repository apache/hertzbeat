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

import java.util.List;
import org.apache.hertzbeat.collector.timer.WheelTimerTask;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.timer.Timeout;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Test case for {@link MetricsCollect}
 */
class MetricsCollectTest {

    @Test
    void calculateFieldsMapsIndexedJsonPathAlias() {
        Metrics metrics = Metrics.builder()
                .name("pods")
                .priority((byte) 0)
                .fields(List.of(
                        Metrics.Field.builder().field("pod").type(CommonConstants.TYPE_STRING).build(),
                        Metrics.Field.builder().field("rc").type(CommonConstants.TYPE_STRING).build()))
                .aliasFields(List.of("$.metadata.name", "$.status.containerStatuses[0].restartCount"))
                .calculates(List.of(
                        "pod=$.metadata.name",
                        "rc=$.status.containerStatuses[0].restartCount"))
                .build();

        Timeout timeout = mock(Timeout.class);
        WheelTimerTask timerTask = mock(WheelTimerTask.class);
        when(timeout.task()).thenReturn(timerTask);
        when(timerTask.getJob()).thenReturn(Job.builder().build());
        MetricsCollect metricsCollect = new MetricsCollect(metrics, timeout, null, "test", List.of());

        CollectRep.MetricsData.Builder collectData = CollectRep.MetricsData.newBuilder();
        collectData.addValueRow(CollectRep.ValueRow.newBuilder()
                .addColumn("pod-a").addColumn("5").build());
        collectData.addValueRow(CollectRep.ValueRow.newBuilder()
                .addColumn("pod-b-pending").addColumn(CommonConstants.NULL_VALUE).build());

        metricsCollect.calculateFields(metrics, collectData);

        List<CollectRep.ValueRow> rows = collectData.getValuesList();
        assertEquals(2, rows.size());
        assertEquals("pod-a", rows.get(0).getColumns(0));
        assertEquals("5", rows.get(0).getColumns(1));
        assertEquals("pod-b-pending", rows.get(1).getColumns(0));
        assertEquals(CommonConstants.NULL_VALUE, rows.get(1).getColumns(1));
    }
}
