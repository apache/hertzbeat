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

package org.apache.hertzbeat.alert.service.impl;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;
import java.util.Collections;
import java.util.List;
import org.apache.hertzbeat.alert.dao.AlertGroupConvergeDao;
import org.apache.hertzbeat.alert.reduce.AlarmGroupReduce;
import org.apache.hertzbeat.common.entity.alerter.AlertGroupConverge;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test case for {@link AlertGroupConvergeServiceImpl}
 */
@ExtendWith(MockitoExtension.class)
public class AlertGroupConvergeServiceImplTest {

    @Mock
    private AlertGroupConvergeDao alertGroupConvergeDao;

    @Mock
    private AlarmGroupReduce alarmGroupReduce;

    @InjectMocks
    private AlertGroupConvergeServiceImpl alertGroupConvergeService;

    private AlertGroupConverge converge;

    @BeforeEach
    void setUp() {
        converge = AlertGroupConverge.builder()
                .id(1L)
                .name("test-converge")
                .build();
    }

    @Test
    void testValidateNewSuccess() {
        converge.setId(null);
        when(alertGroupConvergeDao.findAlertGroupConvergesByName("test-converge"))
                .thenReturn(Collections.emptyList());
        assertDoesNotThrow(() -> alertGroupConvergeService.validate(converge, false));
    }

    @Test
    void testValidateNewDuplicateName() {
        converge.setId(null);
        AlertGroupConverge existing = AlertGroupConverge.builder()
                .id(2L)
                .name("test-converge")
                .build();
        when(alertGroupConvergeDao.findAlertGroupConvergesByName("test-converge"))
                .thenReturn(List.of(existing));
        assertThrows(IllegalArgumentException.class, () -> alertGroupConvergeService.validate(converge, false));
    }

    @Test
    void testValidateNewEmptyName() {
        converge.setName("");
        assertThrows(IllegalArgumentException.class, () -> alertGroupConvergeService.validate(converge, false));

        converge.setName(null);
        assertThrows(IllegalArgumentException.class, () -> alertGroupConvergeService.validate(converge, false));
    }

    @Test
    void testValidateModifySuccessNameUnchanged() {
        when(alertGroupConvergeDao.findAlertGroupConvergesByName("test-converge"))
                .thenReturn(List.of(converge));
        assertDoesNotThrow(() -> alertGroupConvergeService.validate(converge, true));
    }

    @Test
    void testValidateModifySuccessNameChanged() {
        converge.setName("new-name");
        when(alertGroupConvergeDao.findAlertGroupConvergesByName("new-name"))
                .thenReturn(Collections.emptyList());
        assertDoesNotThrow(() -> alertGroupConvergeService.validate(converge, true));
    }

    @Test
    void testValidateModifyDuplicateName() {
        converge.setName("existing-name");
        AlertGroupConverge existing = AlertGroupConverge.builder()
                .id(2L)
                .name("existing-name")
                .build();
        when(alertGroupConvergeDao.findAlertGroupConvergesByName("existing-name"))
                .thenReturn(List.of(existing));
        assertThrows(IllegalArgumentException.class, () -> alertGroupConvergeService.validate(converge, true));
    }
}
