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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;
import java.util.List;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.config.PrometheusProxyConfig;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.apache.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.dao.ParamDao;
import org.apache.hertzbeat.manager.service.AppService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SchedulerInitTest {

    @InjectMocks
    private SchedulerInit schedulerInit;

    @Mock
    private CollectorScheduling collectorScheduling;

    @Mock
    private CollectJobScheduling collectJobScheduling;

    @Mock
    private AppService appService;

    @Mock
    private MonitorDao monitorDao;

    @Mock
    private ParamDao paramDao;

    @Mock
    private CollectorDao collectorDao;

    @Mock
    private CollectorMonitorBindDao collectorMonitorBindDao;

    @Mock
    private PrometheusProxyConfig prometheusProxyConfig;

    @Test
    void restartMapsCronScheduleToRecoveredCollectJob() throws Exception {
        String cronExpression = "0 0 * * * ?";
        Monitor monitor = Monitor.builder()
                .id(1L)
                .jobId(2L)
                .intervals(10)
                .scheduleType("cron")
                .cronExpression(cronExpression)
                .status(CommonConstants.MONITOR_UP_CODE)
                .name("cron-monitor")
                .app("linux")
                .instance("localhost")
                .build();
        Job job = new Job();
        job.setParams(Collections.emptyList());
        when(collectorDao.findAll()).thenReturn(Collections.emptyList());
        when(monitorDao.findMonitorsByStatusNotInAndJobIdNotNull(
                List.of(CommonConstants.MONITOR_PAUSED_CODE))).thenReturn(List.of(monitor));
        when(collectorMonitorBindDao.findAll()).thenReturn(Collections.emptyList());
        when(appService.getAppDefine("linux")).thenReturn(job);
        when(paramDao.findParamsByMonitorId(1L)).thenReturn(Collections.emptyList());
        when(collectJobScheduling.addAsyncCollectJob(job, null)).thenReturn(3L);

        schedulerInit.run();

        assertEquals("cron", job.getScheduleType());
        assertEquals(cronExpression, job.getCronExpression());
        assertEquals(10, job.getDefaultInterval());
        assertEquals(3L, monitor.getJobId());
        verify(monitorDao).save(monitor);
    }

    @Test
    void restartUsesIntervalScheduleForLegacyMonitorWithoutScheduleType() throws Exception {
        Monitor monitor = Monitor.builder()
                .id(1L)
                .jobId(2L)
                .intervals(30)
                .cronExpression("stale legacy cron")
                .status(CommonConstants.MONITOR_UP_CODE)
                .name("legacy-monitor")
                .app("linux")
                .instance("localhost")
                .build();
        Job job = new Job();
        job.setParams(Collections.emptyList());
        when(collectorDao.findAll()).thenReturn(Collections.emptyList());
        when(monitorDao.findMonitorsByStatusNotInAndJobIdNotNull(
                List.of(CommonConstants.MONITOR_PAUSED_CODE))).thenReturn(List.of(monitor));
        when(collectorMonitorBindDao.findAll()).thenReturn(Collections.emptyList());
        when(appService.getAppDefine("linux")).thenReturn(job);
        when(paramDao.findParamsByMonitorId(1L)).thenReturn(Collections.emptyList());

        schedulerInit.run();

        assertEquals("interval", job.getScheduleType());
        assertNull(job.getCronExpression());
        assertEquals(30, job.getDefaultInterval());
    }
}
