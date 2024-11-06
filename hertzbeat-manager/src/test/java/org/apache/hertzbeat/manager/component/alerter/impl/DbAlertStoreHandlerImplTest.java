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

package org.apache.hertzbeat.manager.component.alerter.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.util.HashMap;
import org.apache.hertzbeat.alert.service.AlertService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.apache.hertzbeat.manager.support.exception.IgnoreException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link DbAlertStoreHandlerImpl}
 */

@ExtendWith(MockitoExtension.class)
class DbAlertStoreHandlerImplTest {

    @Mock
    private MonitorService monitorService;

    @Mock
    private AlertService alertService;

    @InjectMocks
    private DbAlertStoreHandlerImpl dbAlertStoreHandler;

    private Alert alert;

    @BeforeEach
    public void setUp() {

        alert = new Alert();
        alert.setTags(new HashMap<>());
        alert.setTarget(CommonConstants.AVAILABILITY);
        alert.setStatus(CommonConstants.ALERT_STATUS_CODE_PENDING);
    }

    @Test
    public void testStoreMonitorNotExist() {

        alert.getTags().put(CommonConstants.TAG_MONITOR_ID, "1");
        when(monitorService.getMonitor(1L)).thenReturn(null);

        dbAlertStoreHandler.store(alert);

        verify(monitorService).getMonitor(1L);
        verify(alertService, never()).addAlert(any(Alert.class));
    }

    @Test
    public void testStoreMonitorPaused() {

        alert.getTags().put(CommonConstants.TAG_MONITOR_ID, "1");

        Monitor monitor = new Monitor();
        monitor.setStatus(CommonConstants.MONITOR_PAUSED_CODE);
        when(monitorService.getMonitor(1L)).thenReturn(monitor);

        dbAlertStoreHandler.store(alert);

        verify(monitorService).getMonitor(1L);
        verify(alertService, never()).addAlert(any(Alert.class));
    }

    @Test
    public void testStoreAvailabilityPendingAndMonitorUp() {

        alert.getTags().put(CommonConstants.TAG_MONITOR_ID, "1");

        Monitor monitor = new Monitor();
        monitor.setId(1L);
        monitor.setStatus(CommonConstants.MONITOR_UP_CODE);
        when(monitorService.getMonitor(1L)).thenReturn(monitor);

        dbAlertStoreHandler.store(alert);

        verify(monitorService).updateMonitorStatus(1L, CommonConstants.MONITOR_DOWN_CODE);
        verify(alertService).addAlert(alert);
    }

    @Test
    public void testStoreAvailabilityRestoredAndMonitorDown() {

        alert.getTags().put(CommonConstants.TAG_MONITOR_ID, "1");
        alert.setStatus(CommonConstants.ALERT_STATUS_CODE_RESTORED);

        Monitor monitor = new Monitor();
        monitor.setId(1L);
        monitor.setStatus(CommonConstants.MONITOR_DOWN_CODE);
        when(monitorService.getMonitor(1L)).thenReturn(monitor);

        dbAlertStoreHandler.store(alert);

        verify(monitorService).updateMonitorStatus(1L, CommonConstants.MONITOR_UP_CODE);
        verify(alertService).addAlert(alert);
    }

    @Test
    public void testStoreIgnoreTagExists() {

        alert.getTags().put(CommonConstants.IGNORE, "true");

        assertThrows(IgnoreException.class, () -> dbAlertStoreHandler.store(alert));
    }

    @Test
    public void testStoreNoMonitorId() {

        alert.getTags().remove(CommonConstants.TAG_MONITOR_ID);
        dbAlertStoreHandler.store(alert);

        verify(alertService).addAlert(alert);
    }

    @Test
    public void testStoreAddMonitorNameAndHostIfNotPresent() {

        alert.getTags().put(CommonConstants.TAG_MONITOR_ID, "1");

        Monitor monitor = new Monitor();
        monitor.setId(1L);
        monitor.setName("test-monitor");
        monitor.setHost("test-host");
        monitor.setStatus(CommonConstants.MONITOR_UP_CODE);
        when(monitorService.getMonitor(1L)).thenReturn(monitor);

        dbAlertStoreHandler.store(alert);

        verify(monitorService).getMonitor(1L);
        assertEquals("test-monitor", alert.getTags().get(CommonConstants.TAG_MONITOR_NAME));
        assertEquals("test-host", alert.getTags().get(CommonConstants.TAG_MONITOR_HOST));
        verify(alertService).addAlert(alert);
    }

}
