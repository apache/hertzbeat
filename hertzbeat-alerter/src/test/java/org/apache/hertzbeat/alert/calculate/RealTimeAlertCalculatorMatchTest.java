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

package org.apache.hertzbeat.alert.calculate;

import com.google.common.collect.Lists;
import org.apache.hertzbeat.alert.AlerterWorkerPool;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.constants.MetricDataConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.apache.hertzbeat.common.queue.impl.InMemoryCommonDataQueue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 *
 */
public class RealTimeAlertCalculatorMatchTest {

    private final AlerterWorkerPool workerPool = new AlerterWorkerPool();

    @Mock
    private CommonDataQueue dataQueue = new InMemoryCommonDataQueue();

    @Mock
    private AlertDefineService alertDefineService;

    @Mock
    private SingleAlertDao singleAlertDao;

    @Mock
    private AlarmCommonReduce alarmCommonReduce;

    @Mock
    private AlarmCacheManager alarmCacheManager;

    private RealTimeAlertCalculator realTimeAlertCalculator;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
        when(singleAlertDao.querySingleAlertsByStatus(any())).thenReturn(new ArrayList<>());
        realTimeAlertCalculator = new RealTimeAlertCalculator(
                workerPool,
                dataQueue,
                alertDefineService,
                singleAlertDao,
                alarmCommonReduce,
                alarmCacheManager,
                false
        );
    }

    @Test
    void testFilterThresholdsByAppAndMetrics_withInstanceExpr_HasSpace() {

        String app = "redis";
        String instanceId = "501045327364864";
        int priority = 0;

        AlertDefine matchDefine = new AlertDefine();
        matchDefine.setExpr("equals(__app__,\"redis\") && equals(__instance__, \"501045327364864\")");

        AlertDefine unmatchDefine = new AlertDefine();
        unmatchDefine.setExpr("equals(__app__,\"redis\") && equals(__instance__, \"999999999\")");

        List<AlertDefine> allDefines = Collections.singletonList(matchDefine);

        List<AlertDefine> filtered = realTimeAlertCalculator.filterThresholdsByAppAndMetrics(allDefines, app, "", Map.of(), instanceId, priority);

        // It should filter out 999999999.
        assertEquals(1, filtered.size());
        assertEquals("equals(__app__,\"redis\") && equals(__instance__, \"501045327364864\")",
                filtered.get(0).getExpr());
    }

    @Test
    void testPrometheusReplaceMultipleJobsApp() throws InterruptedException {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        builder.setId(518789738974464L)
                .setApp("_prometheus_Cool_Stingray_34Nj_copy")
                .setMetrics("canal_instance")
                .setPriority(0)
                .setCode(CollectRep.Code.SUCCESS);

        CollectRep.Field destination = CollectRep.Field.newBuilder().setName("destination").setType(CommonConstants.TYPE_STRING).setLabel(true).build();
        CollectRep.Field mode = CollectRep.Field.newBuilder().setName("mode").setType(CommonConstants.TYPE_STRING).setLabel(true).build();
        CollectRep.Field metricValue = CollectRep.Field.newBuilder().setName("metric_value").setType(CommonConstants.TYPE_NUMBER).setLabel(true).build();

        Map<String, String> meta = new HashMap<>();
        meta.put(MetricDataConstants.INSTANCE_NAME, "Cool_Stingray_34Nj_copy");
        meta.put(MetricDataConstants.INSTANCE_HOST, "127.0.0.1");

        builder.addMetadataAll(meta);
        builder.addAllFields(Lists.newArrayList(destination, mode, metricValue));
        builder.addValueRow(CollectRep.ValueRow.newBuilder().addColumn("example").addColumn("spring").addColumn("1.0").build());

        CollectRep.MetricsData metricsData = builder.build();


        AlertDefine matchDefine = new AlertDefine();
        matchDefine.setId(1L);
        matchDefine.setName("test");
        matchDefine.setExpr(
            "equals(__app__,\"prometheus\") && "
            + "equals(__metrics__,\"canal_instance\") && "
            + "(equals(__instance__, \"515224274242816\") or equals(__instance__, \"518789738974464\")) && "
            + "metric_value > 0"
        );
        matchDefine.setTemplate("Canal instance val: ${value}%");
        matchDefine.setTimes(1);

        List<AlertDefine> allDefines = Collections.singletonList(matchDefine);

        when(alertDefineService.getRealTimeAlertDefines()).thenReturn(allDefines);
        when(dataQueue.pollMetricsDataToAlerter()).thenReturn(metricsData).thenThrow(new InterruptedException());

        realTimeAlertCalculator.startCalculate();

        Thread.sleep(3000);

        verify(alarmCacheManager, times(1)).getPending(any(), any());
        verify(alarmCacheManager, times(1)).putFiring(any(), any(), any());
        verify(alarmCommonReduce, times(1)).reduceAndSendAlarm(any());
    }

    @Test
    void testPrometheusReplaceApp() throws InterruptedException {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        builder.setId(1)
                .setApp("_prometheus_Cool_Stingray_34Nj")
                .setMetrics("canal_instance")
                .setPriority(0)
                .setCode(CollectRep.Code.SUCCESS);

        CollectRep.Field destination = CollectRep.Field.newBuilder().setName("destination").setType(CommonConstants.TYPE_STRING).setLabel(true).build();
        CollectRep.Field mode = CollectRep.Field.newBuilder().setName("mode").setType(CommonConstants.TYPE_STRING).setLabel(true).build();
        CollectRep.Field metricValue = CollectRep.Field.newBuilder().setName("metric_value").setType(CommonConstants.TYPE_NUMBER).setLabel(true).build();

        Map<String, String> meta = new HashMap<>();
        meta.put(MetricDataConstants.INSTANCE_NAME, "Cool_Stingray_34Nj");
        meta.put(MetricDataConstants.INSTANCE_HOST, "127.0.0.1");

        builder.addMetadataAll(meta);
        builder.addAllFields(Lists.newArrayList(destination, mode, metricValue));
        builder.addValueRow(CollectRep.ValueRow.newBuilder().addColumn("example").addColumn("spring").addColumn("1.0").build());

        CollectRep.MetricsData metricsData = builder.build();

        AlertDefine matchDefine = new AlertDefine();
        matchDefine.setId(1L);
        matchDefine.setName("test");
        matchDefine.setExpr("equals(__app__,\"prometheus\") && equals(__metrics__,\"canal_instance\") && metric_value > 0");
        matchDefine.setTemplate("Canal instance val: ${value}%");
        matchDefine.setTimes(1);

        List<AlertDefine> allDefines = Collections.singletonList(matchDefine);

        when(alertDefineService.getRealTimeAlertDefines()).thenReturn(allDefines);
        when(dataQueue.pollMetricsDataToAlerter()).thenReturn(metricsData).thenThrow(new InterruptedException());

        realTimeAlertCalculator.startCalculate();

        Thread.sleep(3000);

        verify(alarmCacheManager, times(1)).getPending(any(), any());
        verify(alarmCacheManager, times(1)).putFiring(any(), any(), any());
        verify(alarmCommonReduce, times(1)).reduceAndSendAlarm(any());
    }

    @Test
    void testCalculateWithNormalApp() throws InterruptedException {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        builder.setId(1)
                .setApp("springboot3")
                .setMetrics("available")
                .setPriority(0)
                .setCode(CollectRep.Code.SUCCESS)
                .setTenantId(0).setId(518679137103104L)
                .setTime(1749110170834L)
                .setPriority(0);

        CollectRep.Field responseTime = CollectRep.Field.newBuilder()
                .setName("responseTime")
                .setType(CommonConstants.TYPE_STRING)
                .setUnit("ms")
                .setLabel(false)
                .build();

        Map<String, String> meta = new HashMap<>();
        meta.put(MetricDataConstants.INSTANCE_NAME, "Vibrant_Gazelle_83vJ");
        meta.put(MetricDataConstants.INSTANCE_HOST, "127.0.0.1");

        builder.addMetadataAll(meta);
        builder.addAllFields(Lists.newArrayList(responseTime));
        builder.addValueRow(CollectRep.ValueRow.newBuilder().addColumn("18").build());

        CollectRep.MetricsData metricsData = builder.build();

        AlertDefine matchDefine = new AlertDefine();
        matchDefine.setId(1L);
        matchDefine.setName("test");
        matchDefine.setExpr("equals(__app__,\"springboot3\") && equals(__metrics__,\"available\") && equals(__instance__, \"518679137103104\") && responseTime > 0");
        matchDefine.setTemplate("Canal instance val: ${value}%");
        matchDefine.setTimes(1);

        List<AlertDefine> allDefines = Collections.singletonList(matchDefine);

        when(alertDefineService.getRealTimeAlertDefines()).thenReturn(allDefines);
        when(dataQueue.pollMetricsDataToAlerter()).thenReturn(metricsData).thenThrow(new InterruptedException());

        realTimeAlertCalculator.startCalculate();

        Thread.sleep(3000);

        verify(alarmCacheManager, times(1)).getPending(any(), any());
        verify(alarmCacheManager, times(1)).putFiring(any(), any(), any());
        verify(alarmCommonReduce, times(1)).reduceAndSendAlarm(any());
    }

}
