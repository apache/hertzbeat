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

import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.alert.util.AlertUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.when;

/**
 * alert cache manager test
 */
@ExtendWith(MockitoExtension.class)
public class AlarmCacheManagerTest {

    @Mock
    private SingleAlertDao singleAlertDao;

    private AlarmCacheManager alarmCacheManager;

    @BeforeEach
    public void setUp() {
        Map<String, String> labels = new HashMap<>();
        labels.put(CommonConstants.LABEL_ALERT_SEVERITY, CommonConstants.ALERT_SEVERITY_CRITICAL);
        labels.put(CommonConstants.LABEL_DEFINE_ID, String.valueOf(1L));
        SingleAlert alert = new SingleAlert();
        alert.setContent("Alert cache manager test");
        alert.setLabels(labels);
        when(singleAlertDao.querySingleAlertsByStatus(CommonConstants.ALERT_STATUS_FIRING)).thenReturn(Collections.singletonList(alert));
        alarmCacheManager = new AlarmCacheManager(singleAlertDao);
    }

    @Test
    void testInit() {
        Map<String, String> labels = new HashMap<>();
        labels.put(CommonConstants.LABEL_ALERT_SEVERITY, CommonConstants.ALERT_SEVERITY_CRITICAL);
        labels.put(CommonConstants.LABEL_DEFINE_ID, String.valueOf(1L));

        String fingerprint = AlertUtil.calculateFingerprint(labels);
        SingleAlert firingSingleAlert = alarmCacheManager.getFiring(1L, fingerprint);
        assertNotNull(firingSingleAlert);
        assertEquals("Alert cache manager test", firingSingleAlert.getContent());
        alarmCacheManager.removeFiring(1L, fingerprint);
        firingSingleAlert = alarmCacheManager.getFiring(1L, fingerprint);
        assertNull(firingSingleAlert);
    }

    @Test
    void testPending() {
        Map<String, String> labels = new HashMap<>();
        labels.put(CommonConstants.LABEL_ALERT_SEVERITY, CommonConstants.ALERT_SEVERITY_CRITICAL);
        labels.put(CommonConstants.ALERT_SEVERITY_INFO, CommonConstants.ALERT_STATUS_PENDING);
        labels.put(CommonConstants.LABEL_DEFINE_ID, String.valueOf(2L));

        SingleAlert alert = new SingleAlert();
        alert.setContent("Alert cache manager test");
        alert.setLabels(labels);

        String fingerprint = AlertUtil.calculateFingerprint(alert.getLabels());
        alarmCacheManager.putPending(2L, fingerprint, alert);

        SingleAlert pendingSingleAlert = alarmCacheManager.getPending(2L, fingerprint);
        assertNotNull(pendingSingleAlert);
        alarmCacheManager.removePending(2L, fingerprint);
        pendingSingleAlert = alarmCacheManager.getPending(2L, fingerprint);
        assertNull(pendingSingleAlert);
    }

    @Test
    void testFiring() {
        Map<String, String> labels = new HashMap<>();
        labels.put(CommonConstants.LABEL_ALERT_SEVERITY, CommonConstants.ALERT_SEVERITY_CRITICAL);
        labels.put(CommonConstants.ALERT_SEVERITY_INFO, CommonConstants.ALERT_STATUS_PENDING);
        labels.put(CommonConstants.LABEL_DEFINE_ID, String.valueOf(3L));

        SingleAlert alert = new SingleAlert();
        alert.setContent("Alert cache manager test");
        alert.setLabels(labels);

        String fingerprint = AlertUtil.calculateFingerprint(alert.getLabels());
        alarmCacheManager.putFiring(3L, fingerprint, alert);

        SingleAlert firingSingleAlert = alarmCacheManager.getFiring(3L, fingerprint);
        assertNotNull(firingSingleAlert);
        alarmCacheManager.removeFiring(3L, fingerprint);
        firingSingleAlert = alarmCacheManager.getFiring(3L, fingerprint);
        assertNull(firingSingleAlert);
    }

    @Test
    void testHistorical() {
        SingleAlert alert = new SingleAlert();
        alert.setContent("Alert cache manager test");
        alert.setLabels(Collections.singletonMap(CommonConstants.LABEL_ALERT_SEVERITY, CommonConstants.ALERT_SEVERITY_CRITICAL));
        when(singleAlertDao.querySingleAlertsByStatus(CommonConstants.ALERT_STATUS_FIRING)).thenReturn(Collections.singletonList(alert));
        alarmCacheManager = new AlarmCacheManager(singleAlertDao);

        String fingerprint = AlertUtil.calculateFingerprint(alert.getLabels());
        SingleAlert historicalSingleAlert = alarmCacheManager.getFiring(4L, fingerprint);
        assertNotNull(historicalSingleAlert);
        SingleAlert singleAlert = alarmCacheManager.removeFiring(4L, fingerprint);
        assertNotNull(singleAlert);
        historicalSingleAlert = alarmCacheManager.getFiring(4L, fingerprint);
        assertNull(historicalSingleAlert);
    }
}