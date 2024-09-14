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

package org.apache.hertzbeat.collector.dispatch.export;

import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import org.apache.hertzbeat.collector.dispatch.entrance.internal.CollectJobService;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

/**
 * test for {@link NettyDataQueue}
 */

class NettyDataQueueTest {

    @Mock
    private CollectJobService collectJobService;

    @InjectMocks
    private NettyDataQueue nettyDataQueue;

    @BeforeEach
    public void setUp() {

        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testSendMetricsData() {

        CollectRep.MetricsData metricsData = CollectRep.MetricsData
                .newBuilder()
                .setMetrics("test")
                .build();
        nettyDataQueue.sendMetricsData(metricsData);

        verify(collectJobService, times(1)).sendAsyncCollectData(metricsData);
    }

}
