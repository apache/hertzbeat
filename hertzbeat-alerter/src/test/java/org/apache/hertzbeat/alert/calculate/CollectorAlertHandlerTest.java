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

import org.apache.hertzbeat.alert.dao.AlertCollectorDao;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.util.AlertUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.Collector;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Collector alert handler test
 */
@ExtendWith(MockitoExtension.class)
public class CollectorAlertHandlerTest {

    @Mock
    private AlertCollectorDao alertCollectorDao;

    @Mock
    private SingleAlertDao singleAlertDao;

    @Mock
    private AlarmCommonReduce alarmCommonReduce;

    private AlarmCacheManager alarmCacheManager;

    private CollectorAlertHandler collectorAlertHandler;

    @BeforeEach
    void setUp() {
        alarmCacheManager = Mockito.spy(new AlarmCacheManager(singleAlertDao));
        collectorAlertHandler = new CollectorAlertHandler(alarmCommonReduce, alertCollectorDao, alarmCacheManager);
    }

    @Test
    public void testOnline() {
        String identity = "localhost-collector";
        Collector collector = Collector.builder()
                .name(identity)
                .ip("127.0.0.1")
                .version("1.0")
                .build();
        SingleAlert singleAlert = SingleAlert.builder().build();

        when(alertCollectorDao.findCollectorByName(any(String.class))).thenReturn(collector);
        when(alarmCacheManager.removeFiring(any(String.class))).thenReturn(singleAlert);

        collectorAlertHandler.online(identity);

        assertEquals(CommonConstants.ALERT_STATUS_RESOLVED, singleAlert.getStatus());
        verify(alarmCommonReduce, times(1)).reduceAndSendAlarm(any(SingleAlert.class));
    }

    @Test
    public void testOffline() {
        String identity = "localhost-collector";
        Collector collector = Collector.builder()
                .name(identity)
                .ip("127.0.0.1")
                .version("1.0")
                .build();

        when(alertCollectorDao.findCollectorByName(any(String.class))).thenReturn(collector);
        when(alarmCacheManager.getFiring(any(String.class))).thenReturn(null);

        collectorAlertHandler.offline(identity);

        verify(alarmCacheManager, times(1)).putFiring(any(String.class), any(SingleAlert.class));
        verify(alarmCommonReduce, times(1)).reduceAndSendAlarm(any(SingleAlert.class));
    }

    @Test
    void testOfflineAndOnlineLifecycle() {
        String identity = "localhost-collector";
        Collector collector = Collector.builder()
                .name(identity)
                .ip("127.0.0.1")
                .version("1.0")
                .build();

        Map<String, String> fingerPrints = new HashMap<>(8);
        fingerPrints.put("collectorName", collector.getName());
        fingerPrints.put("collectorVersion", collector.getVersion());
        fingerPrints.put("collectorHost", collector.getIp());
        String fingerprint = AlertUtil.calculateFingerprint(fingerPrints);

        when(alertCollectorDao.findCollectorByName(identity)).thenReturn(collector);

        // step1. first time offline
        collectorAlertHandler.offline(identity);
        assertNotNull(alarmCacheManager.getFiring(fingerprint));

        // step2. online
        collectorAlertHandler.online(identity);
        assertNull(alarmCacheManager.getFiring(fingerprint));

        // step3. second time offline
        collectorAlertHandler.offline(identity);
        assertNotNull(alarmCacheManager.getFiring(fingerprint));

        // Verify that the push status is correct.
        ArgumentCaptor<SingleAlert> captor = ArgumentCaptor.forClass(SingleAlert.class);
        verify(alarmCommonReduce, atLeast(3)).reduceAndSendAlarm(captor.capture());
        List<SingleAlert> alerts = captor.getAllValues();
        assertEquals(CommonConstants.ALERT_STATUS_FIRING, alerts.get(0).getStatus());
        assertEquals(CommonConstants.ALERT_STATUS_RESOLVED, alerts.get(1).getStatus());
        assertEquals(CommonConstants.ALERT_STATUS_FIRING, alerts.get(2).getStatus());
    }
}