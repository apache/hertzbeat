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

package org.apache.hertzbeat.grafana.controller;

import static org.apache.hertzbeat.common.constants.CommonConstants.FAIL_CODE;
import static org.apache.hertzbeat.common.constants.CommonConstants.SUCCESS_CODE;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.grafana.service.DashboardService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

@ExtendWith(MockitoExtension.class)
class DashboardControllerTest {

    @Mock
    private DashboardService dashboardService;

    @InjectMocks
    private DashboardController dashboardController;

    @Test
    void deleteDashboardReturnsSuccessAfterServiceDeletion() throws Exception {
        ResponseEntity<Message<String>> response = dashboardController.deleteDashboardByMonitorId(7L);

        assertNotNull(response.getBody());
        assertEquals(SUCCESS_CODE, response.getBody().getCode());
        assertEquals("delete dashboard success", response.getBody().getMsg());
        verify(dashboardService).deleteDashboard(7L);
    }

    @Test
    void deleteDashboardReturnsSafeFailureWhenServiceDeletionFails() throws Exception {
        doThrow(new IllegalStateException("private Grafana response"))
                .when(dashboardService).deleteDashboard(7L);

        ResponseEntity<Message<String>> response = dashboardController.deleteDashboardByMonitorId(7L);

        assertNotNull(response.getBody());
        assertEquals(FAIL_CODE, response.getBody().getCode());
        assertEquals("delete dashboard fail", response.getBody().getMsg());
    }
}
