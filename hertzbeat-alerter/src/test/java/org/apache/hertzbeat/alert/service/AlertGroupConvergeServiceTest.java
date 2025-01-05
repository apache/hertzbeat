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
import org.apache.hertzbeat.alert.dao.AlertGroupConvergeDao;
import org.apache.hertzbeat.alert.service.impl.AlertGroupConvergeServiceImpl;
import org.apache.hertzbeat.common.entity.alerter.AlertGroupConverge;
import org.junit.jupiter.api.Disabled;
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
 * test case for {@link AlertGroupConvergeServiceImpl}
 */

@ExtendWith(MockitoExtension.class)
@Disabled
class AlertGroupConvergeServiceTest {

    @Mock
    private AlertGroupConvergeDao alertGroupConvergeDao;

    @InjectMocks
    private AlertGroupConvergeServiceImpl alertGroupConvergeService;

    @Test
    public void testAddAlertGroupConverge() {

        AlertGroupConverge alertGroupConverge = new AlertGroupConverge();
        alertGroupConvergeService.addAlertGroupConverge(alertGroupConverge);

        verify(alertGroupConvergeDao, times(1)).save(alertGroupConverge);
    }

    @Test
    public void testModifyAlertGroupConverge() {

        AlertGroupConverge alertGroupConverge = new AlertGroupConverge();
        alertGroupConvergeService.modifyAlertGroupConverge(alertGroupConverge);

        verify(alertGroupConvergeDao, times(1)).save(alertGroupConverge);
    }

    @Test
    public void testGetAlertGroupConverge() {

        long convergeId = 1L;
        AlertGroupConverge alertGroupConverge = new AlertGroupConverge();
        when(alertGroupConvergeDao.findById(convergeId)).thenReturn(Optional.of(alertGroupConverge));
        AlertGroupConverge result = alertGroupConvergeService.getAlertGroupConverge(convergeId);

        verify(alertGroupConvergeDao, times(1)).findById(convergeId);
        assertEquals(alertGroupConverge, result);
    }

    @Test
    public void testDeleteAlertGroupConverges() {

        Set<Long> convergeIds = Set.of(1L, 2L, 3L);
        alertGroupConvergeService.deleteAlertGroupConverges(convergeIds);

        verify(alertGroupConvergeDao, times(1)).deleteAlertGroupConvergesByIdIn(convergeIds);
    }

    @Test
    public void testGetAlertGroupConverges() {

        Page<AlertGroupConverge> page = new PageImpl<>(Collections.emptyList());
        when(alertGroupConvergeDao.findAll(
                any(Specification.class),
                any(Pageable.class))
        ).thenReturn(page);

        Page<AlertGroupConverge> result = alertGroupConvergeService.getAlertGroupConverges(null, null, "id", "desc", 1, 10);

        verify(alertGroupConvergeDao, times(1)).findAll(
                any(Specification.class),
                any(PageRequest.class)
        );
        assertEquals(page, result);
    }

}
