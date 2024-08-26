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

package org.apache.hertzbeat.manager.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.util.List;
import org.apache.hertzbeat.common.entity.manager.StatusPageComponent;
import org.apache.hertzbeat.common.entity.manager.StatusPageIncident;
import org.apache.hertzbeat.common.entity.manager.StatusPageOrg;
import org.apache.hertzbeat.manager.component.status.CalculateStatus;
import org.apache.hertzbeat.manager.dao.StatusPageComponentDao;
import org.apache.hertzbeat.manager.dao.StatusPageHistoryDao;
import org.apache.hertzbeat.manager.dao.StatusPageIncidentComponentBindDao;
import org.apache.hertzbeat.manager.dao.StatusPageIncidentDao;
import org.apache.hertzbeat.manager.dao.StatusPageOrgDao;
import org.apache.hertzbeat.manager.service.impl.StatusPageServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Sort;

/**
 * test case for {@link StatusPageServiceImpl}
 */

class StatusPageServiceTest {

    @Mock
    private StatusPageOrgDao statusPageOrgDao;

    @Mock
    private StatusPageComponentDao statusPageComponentDao;

    @Mock
    private StatusPageHistoryDao statusPageHistoryDao;

    @Mock
    private StatusPageIncidentDao statusPageIncidentDao;

    @Mock
    private StatusPageIncidentComponentBindDao statusPageIncidentComponentBindDao;

    @Mock
    private CalculateStatus calculateStatus;

    @InjectMocks
    private StatusPageServiceImpl statusPageService = new StatusPageServiceImpl(statusPageIncidentComponentBindDao);

    @BeforeEach
    void setUp() {

        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testQueryStatusPageOrg() {

        StatusPageOrg expectedOrg = new StatusPageOrg();
        when(statusPageOrgDao.findAll()).thenReturn(List.of(expectedOrg));

        StatusPageOrg actualOrg = statusPageService.queryStatusPageOrg();

        assertEquals(expectedOrg, actualOrg);
    }

    @Test
    void testSaveStatusPageOrg() {

        StatusPageOrg inputOrg = new StatusPageOrg();
        when(statusPageOrgDao.save(inputOrg)).thenReturn(inputOrg);

        StatusPageOrg savedOrg = statusPageService.saveStatusPageOrg(inputOrg);

        assertEquals(inputOrg, savedOrg);
    }

    @Test
    void testQueryStatusPageComponents() {

        StatusPageComponent component = new StatusPageComponent();
        when(statusPageComponentDao.findAll()).thenReturn(List.of(component));

        List<StatusPageComponent> components = statusPageService.queryStatusPageComponents();

        assertEquals(1, components.size());
        assertEquals(component, components.get(0));
    }

    @Test
    void testSaveStatusPageComponent() {

        StatusPageComponent component = new StatusPageComponent();
        when(statusPageComponentDao.save(component)).thenReturn(component);

        statusPageService.newStatusPageComponent(component);

        verify(statusPageComponentDao, times(1)).save(component);
    }

    @Test
    void testQueryStatusPageIncidents() {

        StatusPageIncident incident = new StatusPageIncident();
        when(statusPageIncidentDao.findAll(Sort.by(Sort.Direction.DESC, "startTime"))).thenReturn(List.of(incident));

        List<StatusPageIncident> incidents = statusPageService.queryStatusPageIncidents();

        assertEquals(1, incidents.size());
        assertEquals(incident, incidents.get(0));
    }

    @Test
    void testSaveStatusPageIncident() {

        StatusPageIncident incident = new StatusPageIncident();
        when(statusPageIncidentDao.save(incident)).thenReturn(incident);

        statusPageService.newStatusPageIncident(incident);

        verify(statusPageIncidentDao, times(1)).save(incident);
    }

    @Test
    void testDeleteStatusPageIncident() {

        Long incidentId = 1L;
        doNothing().when(statusPageIncidentDao).deleteById(incidentId);

        statusPageService.deleteStatusPageIncident(incidentId);

        verify(statusPageIncidentDao, times(1)).deleteById(incidentId);
    }

}
