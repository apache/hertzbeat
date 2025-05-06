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

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.apache.hertzbeat.common.entity.manager.Collector;
import org.apache.hertzbeat.common.support.exception.CommonException;
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
import org.springframework.context.ApplicationContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

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

    @Mock
    private ApplicationContext applicationContext;


    @Test
    public void getCollectors() {
        when(collectorDao.findAll(any(Specification.class), eq(PageRequest.of(1, 1)))).thenReturn(Page.empty());
        assertDoesNotThrow(() -> collectorService.getCollectors("test", 1, 1));
    }

    @Test
    public void deleteRegisteredCollector() {
        List<String> collectors = new ArrayList<>();
        collectors.add("test");
        collectorService.deleteRegisteredCollector(collectors);
    }

    @Test
    public void hasCollector() {
        when(collectorDao.findCollectorByName("test")).thenReturn(Optional.empty());
        assertFalse(collectorService.hasCollector("test"));
    }

    @Test
    public void testGenerateCollectorDeployInfo() {
        when(collectorDao.findCollectorByName("test")).thenReturn(Optional.of(new Collector()));
        assertThrows(CommonException.class, ()->{
            collectorService.generateCollectorDeployInfo("test");
        });
    }

    @Test
    public void testMakeCollectorsOffline() {
        assertDoesNotThrow(() -> {
            collectorService.makeCollectorsOffline(new ArrayList<>());
        });
    }

    @Test
    public void testMakeCollectorsOnline() {
        assertDoesNotThrow(() -> {
            collectorService.makeCollectorsOnline(new ArrayList<>());
        });
    }
}
