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

import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.dto.CollectorInfo;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.manager.CollectorMonitorBind;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.message.ClusterMsg;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.apache.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.dao.ParamDao;
import org.apache.hertzbeat.manager.scheduler.netty.ManageServer;
import org.apache.hertzbeat.manager.service.AppService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Test case for {@link CollectorJobScheduler}
 */
@ExtendWith(MockitoExtension.class)
public class CollectorJobSchedulerTest {
    @InjectMocks
    private CollectorJobScheduler collectorJobScheduler;
    @Mock
    private ConsistentHash consistentHash;
    @Mock
    private CollectorDao collectorDao;
    @Mock
    private CollectorMonitorBindDao collectorMonitorBindDao;
    @Mock
    private MonitorDao monitorDao;
    @Mock
    private ParamDao paramDao;
    @Mock
    private AppService appService;


    @BeforeEach
    void setUp() {

    }

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

    @Test
    public void testCollectorGoOnlineJobMetadataNotEmpty() {
        String identity = "collector-1";
        CollectorInfo collectorInfo = CollectorInfo.builder().ip("127.0.0.1").mode("public").version("1.0.0").build();
        org.apache.hertzbeat.common.entity.manager.Collector collector = org.apache.hertzbeat.common.entity.manager.Collector.builder()
                .name(identity).ip("127.0.0.1").mode("public").version("1.0.0").status(CommonConstants.COLLECTOR_STATUS_OFFLINE).build();
        when(collectorDao.findCollectorByName(identity)).thenReturn(Optional.of(collector));

        // mock bind
        CollectorMonitorBind bind = CollectorMonitorBind.builder().collector(identity).monitorId(1L).build();
        when(collectorMonitorBindDao.findCollectorMonitorBindsByCollector(identity)).thenReturn(List.of(bind));

        // mock monitor
        Monitor monitor = Monitor.builder().id(1L).name("test-monitor").host("127.0.0.1").app("test-app").intervals(60).status((byte) 1).build();
        when(monitorDao.findMonitorsByIdIn(any())).thenReturn(List.of(monitor));

        // mock Params
        when(paramDao.findParamsByMonitorId(eq(monitor.getId()))).thenReturn(List.of());

        // mock appDefine
        Job appDefine = new Job();
        appDefine.setParams(Collections.emptyList());
        when(appService.getAppDefine(anyString())).thenReturn(appDefine);

        ConsistentHash.Node node = new ConsistentHash.Node(identity, collector.getMode(),
                collector.getIp(), System.currentTimeMillis(), null);
        when(consistentHash.getNode("collector-1")).thenReturn(node);

        ManageServer manageServer = mock(ManageServer.class);
        collectorJobScheduler.setManageServer(manageServer);
        // run
        collectorJobScheduler.collectorGoOnline(identity, collectorInfo);

        // Capture the parameters of sendMsg
        ArgumentCaptor<ClusterMsg.Message> msgCaptor = ArgumentCaptor.forClass(ClusterMsg.Message.class);
        verify(manageServer, atLeastOnce()).sendMsg(eq("collector-1"), msgCaptor.capture());
        ClusterMsg.Message message = msgCaptor.getValue();

        Job job = JsonUtil.fromJson(message.getMsg().toStringUtf8(), Job.class);
        assertNotNull(job);
        assertNotNull(job.getMetadata());
        assertEquals("test-monitor", job.getMetadata().get(CommonConstants.LABEL_INSTANCE_NAME));
        assertEquals("127.0.0.1", job.getMetadata().get(CommonConstants.LABEL_INSTANCE_HOST));
    }

}
