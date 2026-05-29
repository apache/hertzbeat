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

package org.apache.hertzbeat.manager.service.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

/**
 * Contract for old monitor page query persistence.
 */
@ExtendWith(MockitoExtension.class)
class OldMonitorPageQueryServiceTest {

    @InjectMocks
    private OldMonitorPageQueryService oldMonitorPageQueryService;

    @Mock
    private MonitorDao monitorDao;

    @Test
    void findMonitorPageUsesDefaultSortAndPageRequest() {
        when(monitorDao.findAll(any(Specification.class), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));

        oldMonitorPageQueryService.findMonitorPage(null, null, null, null, null, null, 2, 25, null);

        ArgumentCaptor<PageRequest> pageRequestCaptor = ArgumentCaptor.forClass(PageRequest.class);
        verify(monitorDao).findAll(any(Specification.class), pageRequestCaptor.capture());
        PageRequest pageRequest = pageRequestCaptor.getValue();
        Sort.Order order = pageRequest.getSort().getOrderFor("id");
        assertEquals(2, pageRequest.getPageNumber());
        assertEquals(25, pageRequest.getPageSize());
        assertEquals(Sort.Direction.DESC, order.getDirection());
    }

    @Test
    void findMonitorPageUsesSubmittedSortAndOrder() {
        when(monitorDao.findAll(any(Specification.class), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));

        oldMonitorPageQueryService.findMonitorPage(null, null, null, null, "name", "asc", 0, 10, null);

        ArgumentCaptor<PageRequest> pageRequestCaptor = ArgumentCaptor.forClass(PageRequest.class);
        verify(monitorDao).findAll(any(Specification.class), pageRequestCaptor.capture());
        PageRequest pageRequest = pageRequestCaptor.getValue();
        Sort.Order order = pageRequest.getSort().getOrderFor("name");
        assertEquals(0, pageRequest.getPageNumber());
        assertEquals(10, pageRequest.getPageSize());
        assertEquals(Sort.Direction.ASC, order.getDirection());
    }

    @Test
    void findMonitorPageDelegatesFilteredQueryToMonitorDao() {
        when(monitorDao.findAll(any(Specification.class), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));

        oldMonitorPageQueryService.findMonitorPage(
                List.of(42L), "linux", "prod", (byte) 1, "gmtUpdate", "desc", 1, 20, "team=ops");

        verify(monitorDao).findAll(any(Specification.class), any(PageRequest.class));
    }
}
