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

package org.apache.hertzbeat.alert.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.util.Optional;
import java.util.Set;
import org.apache.hertzbeat.alert.dao.AlertSilenceDao;
import org.apache.hertzbeat.alert.service.impl.AlertSilenceServiceImpl;
import org.apache.hertzbeat.common.entity.alerter.AlertSilence;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

/**
 * test case for {@link AlertSilenceServiceImpl}
 */

class AlertSilenceServiceTest {

    @Mock
    private AlertSilenceDao alertSilenceDao;

    @InjectMocks
    private AlertSilenceServiceImpl alertSilenceService;

    @BeforeEach
    void setUp() {

        MockitoAnnotations.openMocks(this);

        alertSilenceDao.save(AlertSilence
                .builder()
                .id(1L)
                .type((byte) 1)
                .build()
        );

        assertNotNull(alertSilenceDao.findAll());
    }

    @Test
    void testValidate() {

        AlertSilence alertSilence = new AlertSilence();
        alertSilence.setType((byte) 1);

        alertSilenceService.validate(alertSilence, false);

        assertNotNull(alertSilence.getDays());
        assertEquals(7, alertSilence.getDays().size());
    }

    @Test
    void testAddAlertSilence() {

        AlertSilence alertSilence = new AlertSilence();
        when(alertSilenceDao.save(any(AlertSilence.class))).thenReturn(alertSilence);

        assertDoesNotThrow(() -> alertSilenceService.addAlertSilence(alertSilence));
        verify(alertSilenceDao, times(1)).save(alertSilence);
    }

    @Test
    void testModifyAlertSilence() {
        AlertSilence alertSilence = new AlertSilence();
        when(alertSilenceDao.save(any(AlertSilence.class))).thenReturn(alertSilence);

        assertDoesNotThrow(() -> alertSilenceService.modifyAlertSilence(alertSilence));
        verify(alertSilenceDao, times(1)).save(alertSilence);
    }

    @Test
    void testGetAlertSilence() {
        AlertSilence alertSilence = new AlertSilence();
        when(alertSilenceDao.findById(anyLong())).thenReturn(Optional.of(alertSilence));

        AlertSilence result = alertSilenceService.getAlertSilence(1L);
        assertNotNull(result);
        verify(alertSilenceDao, times(1)).findById(1L);
    }

    @Test
    void testGetAlertSilences() {
        when(alertSilenceDao.findAll(any(Specification.class), any(PageRequest.class))).thenReturn(Page.empty());
        assertDoesNotThrow(() -> alertSilenceService.getAlertSilences(null, null, "id", "desc", 1, 10));
        verify(alertSilenceDao, times(1)).findAll(any(Specification.class), any(PageRequest.class));

        assertNotNull(alertSilenceService.getAlertSilences(null, null, "id", "desc", 1, 10));
    }

    @Test
    void testDeleteAlertSilences() {

        alertSilenceDao.deleteAlertSilencesByIdIn(Set.of(1L));

        verify(alertSilenceDao, times(1)).deleteAlertSilencesByIdIn(Set.of(1L));
    }

}
