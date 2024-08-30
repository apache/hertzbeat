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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.util.Collections;
import java.util.Optional;
import java.util.Set;
import org.apache.hertzbeat.alert.dao.AlertConvergeDao;
import org.apache.hertzbeat.alert.service.impl.AlertConvergeServiceImpl;
import org.apache.hertzbeat.common.entity.alerter.AlertConverge;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

/**
 * test case for {@link org.apache.hertzbeat.alert.service.impl.AlertConvergeServiceImpl}
 */

@ExtendWith(MockitoExtension.class)
class AlertConvergeServiceTest {

    @Mock
    private AlertConvergeDao alertConvergeDao;

    @InjectMocks
    private AlertConvergeServiceImpl alertConvergeService;

    @Test
    public void testAddAlertConverge() {

        AlertConverge alertConverge = new AlertConverge();
        alertConvergeService.addAlertConverge(alertConverge);

        verify(alertConvergeDao, times(1)).save(alertConverge);
    }

    @Test
    public void testModifyAlertConverge() {

        AlertConverge alertConverge = new AlertConverge();
        alertConvergeService.modifyAlertConverge(alertConverge);

        verify(alertConvergeDao, times(1)).save(alertConverge);
    }

    @Test
    public void testGetAlertConverge() {

        long convergeId = 1L;
        AlertConverge alertConverge = new AlertConverge();
        when(alertConvergeDao.findById(convergeId)).thenReturn(Optional.of(alertConverge));
        AlertConverge result = alertConvergeService.getAlertConverge(convergeId);

        verify(alertConvergeDao, times(1)).findById(convergeId);
        assertEquals(alertConverge, result);
    }

    @Test
    public void testDeleteAlertConverges() {

        Set<Long> convergeIds = Set.of(1L, 2L, 3L);
        alertConvergeService.deleteAlertConverges(convergeIds);

        verify(alertConvergeDao, times(1)).deleteAlertConvergesByIdIn(convergeIds);
    }

    @Test
    public void testGetAlertConverges() {

        Page<AlertConverge> page = new PageImpl<>(Collections.emptyList());
        when(alertConvergeDao.findAll(
                any(Specification.class),
                any(Pageable.class))
        ).thenReturn(page);

        Page<AlertConverge> result = alertConvergeService.getAlertConverges(null, null, "id", "desc", 1, 10);

        verify(alertConvergeDao, times(1)).findAll(
                any(Specification.class),
                any(PageRequest.class)
        );
        assertEquals(page, result);
    }

}
