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

package org.apache.hertzbeat.alert.notice.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.apache.hertzbeat.alert.dao.GroupAlertDao;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.ArrayList;
import java.util.List;

/**
 * Test case for {@link DbAlertStoreHandlerImpl}
 */
@ExtendWith(MockitoExtension.class)
class DbAlertStoreHandlerImplTest {
    
    @Mock
    private GroupAlertDao groupAlertDao;
    
    @Mock
    private SingleAlertDao singleAlertDao;

    @InjectMocks
    private DbAlertStoreHandlerImpl dbAlertStoreHandler;

    private GroupAlert groupAlert;
    private SingleAlert singleAlert;

    @BeforeEach
    public void setUp() {
        groupAlert = new GroupAlert();
        singleAlert = new SingleAlert();
        singleAlert.setFingerprint("test-fingerprint");
        List<SingleAlert> alerts = new ArrayList<>();
        alerts.add(singleAlert);
        groupAlert.setAlerts(alerts);
    }

    @Test
    public void testStoreEmptyAlerts() {
        GroupAlert emptyGroupAlert = new GroupAlert();
        dbAlertStoreHandler.store(emptyGroupAlert);
        verify(groupAlertDao, never()).save(any(GroupAlert.class));
    }

    @Test
    public void testStoreNewAlert() {
        String groupKey = "test-group";
        groupAlert.setGroupKey(groupKey);

        when(groupAlertDao.findByGroupKey(groupKey)).thenReturn(null);

        SingleAlert savedSingleAlert = new SingleAlert();
        savedSingleAlert.setFingerprint("test-finger");
        when(singleAlertDao.save(any(SingleAlert.class))).thenReturn(savedSingleAlert);

        GroupAlert savedGroupAlert = new GroupAlert();
        savedGroupAlert.setGroupKey(groupKey);
        when(groupAlertDao.save(any(GroupAlert.class))).thenReturn(savedGroupAlert);
        
        dbAlertStoreHandler.store(groupAlert);

        verify(singleAlertDao).save(any(SingleAlert.class));
        verify(groupAlertDao).save(groupAlert);
    }


    @Test
    public void testStoreExistingAlert() {
        String groupKey = "test-group";
        String fingerprint = "test-fingerprint";

        groupAlert.setGroupKey(groupKey);
        singleAlert.setFingerprint(fingerprint);

        GroupAlert existingGroup = new GroupAlert();
        existingGroup.setId(1L);
        when(groupAlertDao.findByGroupKey(groupKey)).thenReturn(existingGroup);

        SingleAlert existingAlert = new SingleAlert();
        existingAlert.setId(1L);
        existingAlert.setStatus("firing");
        existingAlert.setStartAt(1000L);
        existingAlert.setActiveAt(2000L);
        existingAlert.setTriggerTimes(1);
        when(singleAlertDao.findByFingerprint(fingerprint)).thenReturn(existingAlert);

        when(singleAlertDao.save(any(SingleAlert.class))).thenReturn(existingAlert);
        when(groupAlertDao.save(any(GroupAlert.class))).thenReturn(existingGroup);

        dbAlertStoreHandler.store(groupAlert);

        verify(singleAlertDao).save(any(SingleAlert.class));
        verify(groupAlertDao).save(groupAlert);
        assertEquals(1L, groupAlert.getId());
    }

    @Test
    public void storeResolvedAlertKeepsGroupFiringWhenOtherGroupAlertsStillFire() {
        String groupKey = "instance:host1";
        String resolvedFingerprint = "cpu";
        String firingFingerprint = "memory";
        groupAlert.setGroupKey(groupKey);
        groupAlert.setStatus(CommonConstants.ALERT_STATUS_RESOLVED);
        singleAlert.setFingerprint(resolvedFingerprint);
        singleAlert.setStatus(CommonConstants.ALERT_STATUS_RESOLVED);

        GroupAlert existingGroup = new GroupAlert();
        existingGroup.setId(1L);
        existingGroup.setAlertFingerprints(List.of(resolvedFingerprint, firingFingerprint));
        when(groupAlertDao.findByGroupKey(groupKey)).thenReturn(existingGroup);

        SingleAlert previousFiringAlert = new SingleAlert();
        previousFiringAlert.setId(1L);
        previousFiringAlert.setFingerprint(resolvedFingerprint);
        previousFiringAlert.setStatus(CommonConstants.ALERT_STATUS_FIRING);
        previousFiringAlert.setStartAt(1000L);
        previousFiringAlert.setActiveAt(2000L);
        previousFiringAlert.setTriggerTimes(3);
        when(singleAlertDao.findByFingerprint(resolvedFingerprint)).thenReturn(previousFiringAlert);

        SingleAlert savedResolvedAlert = new SingleAlert();
        savedResolvedAlert.setId(1L);
        savedResolvedAlert.setFingerprint(resolvedFingerprint);
        savedResolvedAlert.setStatus(CommonConstants.ALERT_STATUS_RESOLVED);
        when(singleAlertDao.save(any(SingleAlert.class))).thenReturn(savedResolvedAlert);

        SingleAlert existingFiringAlert = new SingleAlert();
        existingFiringAlert.setFingerprint(firingFingerprint);
        existingFiringAlert.setStatus(CommonConstants.ALERT_STATUS_FIRING);
        when(singleAlertDao.findSingleAlertsByFingerprintIn(anyList()))
                .thenReturn(List.of(savedResolvedAlert, existingFiringAlert));

        when(groupAlertDao.save(any(GroupAlert.class))).thenAnswer(invocation -> invocation.getArgument(0));

        GroupAlert savedGroupAlert = dbAlertStoreHandler.store(groupAlert);

        assertEquals(CommonConstants.ALERT_STATUS_FIRING, savedGroupAlert.getStatus());
        assertEquals(CommonConstants.ALERT_STATUS_FIRING, groupAlert.getStatus());
        assertEquals(2, savedGroupAlert.getAlerts().size());
        assertTrue(savedGroupAlert.getAlerts().stream()
                .anyMatch(alert -> firingFingerprint.equals(alert.getFingerprint())
                        && CommonConstants.ALERT_STATUS_FIRING.equals(alert.getStatus())));
    }

    @Test
    public void storeFiringGroupDoesNotQueryHistoricalAlerts() {
        String groupKey = "instance:host1";
        groupAlert.setGroupKey(groupKey);
        groupAlert.setStatus(CommonConstants.ALERT_STATUS_FIRING);
        singleAlert.setFingerprint("cpu");
        singleAlert.setStatus(CommonConstants.ALERT_STATUS_FIRING);
        when(groupAlertDao.findByGroupKey(groupKey)).thenReturn(null);
        when(singleAlertDao.save(any(SingleAlert.class))).thenReturn(singleAlert);
        when(groupAlertDao.save(any(GroupAlert.class))).thenAnswer(invocation -> invocation.getArgument(0));

        GroupAlert savedGroupAlert = dbAlertStoreHandler.store(groupAlert);

        assertEquals(CommonConstants.ALERT_STATUS_FIRING, savedGroupAlert.getStatus());
        verify(singleAlertDao, never()).findSingleAlertsByFingerprintIn(anyList());
    }

}
