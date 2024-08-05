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

import org.apache.hertzbeat.common.entity.manager.Collector;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.apache.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.apache.hertzbeat.manager.scheduler.ConsistentHash;
import org.apache.hertzbeat.manager.scheduler.netty.ManageServer;
import org.apache.hertzbeat.manager.service.impl.CollectorServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Test case for {@link CollectorService}
 */
@ExtendWith(MockitoExtension.class)
public class CollectorServiceTest {

    @Spy
    @InjectMocks
    private CollectorServiceImpl collectorService;

    @Mock
    private CollectorDao collectorDao;

    @Mock
    private ConsistentHash consistentHash;

    @Mock
    private CollectorMonitorBindDao collectorMonitorBindDao;

    @Mock
    private ManageServer manageServer;


    @Test
    public void getCollectors() {
        Specification<Collector> specification = mock(Specification.class);
        when(collectorDao.findAll(specification, PageRequest.of(1, 1))).thenReturn(Page.empty());
        assertDoesNotThrow(() -> collectorService.getCollectors(specification, PageRequest.of(1, 1)));
    }

    @Test
    public void deleteRegisteredCollector() {
        List<String> collectors = new ArrayList<>();
        collectors.add("test");
        collectorService.deleteRegisteredCollector(collectors);
    }

    @Test
    public void hasCollector() {
        collectorService.hasCollector("test");
    }
}
