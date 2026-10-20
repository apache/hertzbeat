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

package org.apache.hertzbeat.alert.calculate.realtime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.alert.AlerterWorkerPool;
import org.apache.hertzbeat.alert.calculate.AlarmCacheManager;
import org.apache.hertzbeat.alert.calculate.JexlExprCalculator;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class MetricsRealTimeAlertCalculatorOwnershipTest {

    private CommonDataQueue dataQueue;
    private AlertDefineService alertDefineService;
    private MetricsRealTimeAlertCalculator calculator;

    @BeforeEach
    void setUp() {
        AlerterWorkerPool workerPool = mock(AlerterWorkerPool.class);
        dataQueue = mock(CommonDataQueue.class);
        alertDefineService = mock(AlertDefineService.class);
        SingleAlertDao singleAlertDao = mock(SingleAlertDao.class);
        AlarmCommonReduce alarmCommonReduce = mock(AlarmCommonReduce.class);
        AlarmCacheManager alarmCacheManager = mock(AlarmCacheManager.class);

        when(singleAlertDao.querySingleAlertsByWorkspaceIdAndStatus(org.mockito.ArgumentMatchers.eq("default"),
                org.mockito.ArgumentMatchers.anyString()))
                .thenReturn(Collections.emptyList());
        when(alertDefineService.getMetricsRealTimeAlertDefines()).thenReturn(Collections.emptyList());

        calculator = new MetricsRealTimeAlertCalculator(workerPool, dataQueue, alertDefineService,
                singleAlertDao, alarmCommonReduce, alarmCacheManager, new JexlExprCalculator(), false);
    }

    @Test
    void handoffSendsIndependentCopyAndClosesPolledInstance() {
        CollectRep.MetricsData polled = CollectRep.MetricsData.newBuilder()
                .setId(11L)
                .setApp("linux")
                .setMetrics("cpu")
                .setCode(CollectRep.Code.SUCCESS)
                .addField(CollectRep.Field.newBuilder().setName("usage").setType(0).build())
                .addValueRow(CollectRep.ValueRow.newBuilder().addColumn("9").build())
                .build();
        AtomicReference<CollectRep.MetricsData> sent = new AtomicReference<>();
        doAnswer(invocation -> {
            sent.set(invocation.getArgument(0));
            return null;
        }).when(dataQueue).sendMetricsDataToStorage(any());

        calculator.handoffAndCalculate(polled);

        CollectRep.MetricsData storageCopy = sent.get();
        assertNotSame(polled, storageCopy);
        assertEquals(11L, storageCopy.getId());
        assertEquals("cpu", storageCopy.getMetrics());
        assertEquals("9", storageCopy.getValues().getFirst().getColumns(0));
        assertTrue(polled.getFields().isEmpty());
        storageCopy.close();
    }

    @Test
    void handoffClosesBothInstancesWhenStorageSendFails() {
        CollectRep.MetricsData polled = CollectRep.MetricsData.newBuilder()
                .setId(12L)
                .setMetrics("cpu")
                .setCode(CollectRep.Code.SUCCESS)
                .addField(CollectRep.Field.newBuilder().setName("usage").setType(0).build())
                .addValueRow(CollectRep.ValueRow.newBuilder().addColumn("1").build())
                .build();
        ArgumentCaptor<CollectRep.MetricsData> captor = ArgumentCaptor.forClass(CollectRep.MetricsData.class);
        doThrow(new IllegalStateException("queue full")).when(dataQueue).sendMetricsDataToStorage(captor.capture());

        assertThrows(IllegalStateException.class, () -> calculator.handoffAndCalculate(polled));

        CollectRep.MetricsData storageCopy = captor.getValue();
        assertTrue(polled.getFields().isEmpty());
        assertTrue(storageCopy.getFields().isEmpty());
        verify(alertDefineService, never()).getMetricsRealTimeAlertDefines();
    }
}
