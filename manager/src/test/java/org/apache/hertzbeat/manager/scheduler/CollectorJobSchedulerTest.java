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

package org.apache.hertzbeat.manager.scheduler;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.common.entity.message.CollectRep;
import java.util.ArrayList;
import java.util.List;

import org.apache.hertzbeat.common.entity.job.Job;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link CollectorJobScheduler}
 */
@ExtendWith(MockitoExtension.class)
public class CollectorJobSchedulerTest {
    @InjectMocks
    private CollectorJobScheduler collectorJobScheduler;
    @Mock
    private ConsistentHash consistentHash;

    @Test
    public void testCollectSyncJobData() {
        assertDoesNotThrow(() -> {
            Job job = new Job();
            when(consistentHash.preDispatchJob(any(String.class))).thenReturn(null);
            List<?> list = collectorJobScheduler.collectSyncJobData(job);
            assertEquals(1, list.size());
        });
    }

    @Test
    public void testCollectSyncJobResource() {
        assertDoesNotThrow(() -> {
            collectorJobScheduler.collectSyncJobResponse(null);
            collectorJobScheduler.collectSyncJobResponse(new ArrayList<>());

            List<CollectRep.MetricsData> metricsDataList = new ArrayList<CollectRep.MetricsData>();
            metricsDataList.add(CollectRep.MetricsData.newBuilder().build());
            collectorJobScheduler.collectSyncJobResponse(metricsDataList);
        });
    }
}
