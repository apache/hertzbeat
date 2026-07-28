/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.push.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.common.support.event.MonitorDeletedEvent;
import org.apache.hertzbeat.push.dao.PushMonitorDao;
import org.apache.hertzbeat.push.service.impl.PushGatewayServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PushGatewayServiceImplTest {

    @Mock
    private CommonDataQueue commonDataQueue;

    @Mock
    private PushMonitorDao pushMonitorDao;

    @Test
    void deletedMonitorIdentityIsEvictedBeforeSameJobAndInstanceArePushedAgain() throws Exception {
        long deletedMonitorId = 41L;
        String job = "proof_job";
        String instance = "proof_instance";
        Monitor deletedMonitor = Monitor.builder()
                .id(deletedMonitorId)
                .app(job)
                .name(instance)
                .instance(instance)
                .type(CommonConstants.MONITOR_TYPE_PUSH_AUTO_CREATE)
                .build();
        when(pushMonitorDao.findMonitorsByType(CommonConstants.MONITOR_TYPE_PUSH_AUTO_CREATE))
                .thenReturn(List.of(deletedMonitor));
        when(pushMonitorDao.save(any(Monitor.class))).thenAnswer(invocation -> invocation.getArgument(0));
        PushGatewayServiceImpl service = new PushGatewayServiceImpl(commonDataQueue, pushMonitorDao);
        service.onMonitorDeleted(new MonitorDeletedEvent(this, deletedMonitorId));

        boolean pushed = service.pushPrometheusMetrics(new ByteArrayInputStream(
                "proof_metric_total{region=\"east\"} 42\n".getBytes(StandardCharsets.UTF_8)), job, instance);

        assertTrue(pushed);
        ArgumentCaptor<Monitor> monitorCaptor = ArgumentCaptor.forClass(Monitor.class);
        verify(pushMonitorDao).save(monitorCaptor.capture());
        assertNotEquals(deletedMonitorId, monitorCaptor.getValue().getId());
        ArgumentCaptor<CollectRep.MetricsData> metricsCaptor =
                ArgumentCaptor.forClass(CollectRep.MetricsData.class);
        verify(commonDataQueue).sendMetricsData(metricsCaptor.capture());
        assertNotEquals(deletedMonitorId, metricsCaptor.getValue().getId());
    }

    @Test
    void jobAndInstanceIdentityDoesNotCollideAtUnderscoreBoundaries() {
        when(pushMonitorDao.findMonitorsByType(CommonConstants.MONITOR_TYPE_PUSH_AUTO_CREATE)).thenReturn(List.of());
        when(pushMonitorDao.save(any(Monitor.class))).thenAnswer(invocation -> invocation.getArgument(0));
        PushGatewayServiceImpl service = new PushGatewayServiceImpl(commonDataQueue, pushMonitorDao);
        byte[] payload = "proof_metric_total 42\n".getBytes(StandardCharsets.UTF_8);

        assertTrue(service.pushPrometheusMetrics(new ByteArrayInputStream(payload), "a_b", "c"));
        assertTrue(service.pushPrometheusMetrics(new ByteArrayInputStream(payload), "a", "b_c"));

        ArgumentCaptor<Monitor> monitorCaptor = ArgumentCaptor.forClass(Monitor.class);
        verify(pushMonitorDao, times(2)).save(monitorCaptor.capture());
        assertEquals(2, monitorCaptor.getAllValues().size());
        assertEquals(
                List.of("a_b/c", "a/b_c"),
                monitorCaptor.getAllValues().stream()
                        .map(monitor -> monitor.getApp() + "/" + monitor.getName())
                        .toList());
        assertNotEquals(
                monitorCaptor.getAllValues().get(0).getId(),
                monitorCaptor.getAllValues().get(1).getId());
        ArgumentCaptor<CollectRep.MetricsData> metricsCaptor =
                ArgumentCaptor.forClass(CollectRep.MetricsData.class);
        verify(commonDataQueue, times(2)).sendMetricsData(metricsCaptor.capture());
        assertNotEquals(
                metricsCaptor.getAllValues().get(0).getId(),
                metricsCaptor.getAllValues().get(1).getId());
    }
}
