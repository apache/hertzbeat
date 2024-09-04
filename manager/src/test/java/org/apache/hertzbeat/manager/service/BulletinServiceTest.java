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
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.bulletin.Bulletin;
import org.apache.hertzbeat.common.entity.manager.bulletin.BulletinDto;
import org.apache.hertzbeat.common.entity.manager.bulletin.BulletinMetricsData;
import org.apache.hertzbeat.manager.dao.BulletinDao;
import org.apache.hertzbeat.manager.service.impl.BulletinServiceImpl;
import org.apache.hertzbeat.warehouse.store.realtime.RealTimeDataReader;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

/**
 * Test case for {@link BulletinService}
 */
@ExtendWith(MockitoExtension.class)
public class BulletinServiceTest {
    @InjectMocks
    private BulletinServiceImpl bulletinService;

    @Mock
    private BulletinDao bulletinDao;

    @Mock
    private MonitorService monitorService;

    @Mock
    private RealTimeDataReader realTimeDataReader;

    @Test
    public void testValidate() throws Exception {
        assertThrows(IllegalArgumentException.class, () -> {
            bulletinService.validate(null);
        });

        assertThrows(IllegalArgumentException.class, () -> {
            bulletinService.validate(new BulletinDto());
        });

        assertThrows(IllegalArgumentException.class, () -> {
            BulletinDto obj = new BulletinDto();
            obj.setApp("app");
            bulletinService.validate(obj);
        });

        assertThrows(IllegalArgumentException.class, () -> {
            Map<String, List<String>> fields = new HashMap<String, List<String>>();
            fields.put("field1", null);

            BulletinDto obj = new BulletinDto();
            obj.setApp("app");
            obj.setFields(fields);
            bulletinService.validate(obj);
        });

        assertDoesNotThrow(() -> {
            Map<String, List<String>> fields = new HashMap<String, List<String>>();
            fields.put("field1", null);

            List<Long> ids = new ArrayList<Long>();
            ids.add((long) 1);

            BulletinDto obj = new BulletinDto();
            obj.setApp("app");
            obj.setFields(fields);
            obj.setMonitorIds(ids);
            bulletinService.validate(obj);
        });
    }

    @Test
    public void testGetBulletinByName() throws Exception {
        Bulletin bulletin = new Bulletin();

        when(bulletinDao.findByName("test")).thenReturn(bulletin);
        assertEquals(bulletin, bulletinService.getBulletinByName("test"));
    }

    @Test
    public void testGetAllNames() throws Exception {
        Bulletin bulletin = new Bulletin();
        bulletin.setName("test");

        List<Bulletin> items = new ArrayList<Bulletin>();
        items.add(bulletin);

        List<String> names = new ArrayList<String>();
        names.add("test");

        when(bulletinDao.findAll()).thenReturn(items);
        assertEquals(names, bulletinService.getAllNames());
    }

    @Test
    public void testAddBulletin() throws Exception {
        Map<String, List<String>> fields = new HashMap<String, List<String>>();
        fields.put("field1", null);

        BulletinDto bulletinDto = new BulletinDto();
        bulletinDto.setApp("app");
        bulletinDto.setFields(fields);

        assertDoesNotThrow(() -> {
            bulletinService.addBulletin(bulletinDto);
        });
    }

    @Test
    public void testGetBulletins() throws Exception {
        Bulletin bulletin = new Bulletin();
        bulletin.setId((long) 1);

        PageRequest pageRequest = PageRequest.of(0, 10);

        List<Bulletin> content = Collections.singletonList(bulletin);
        long total = 1;

        Page<Bulletin> items = new PageImpl<Bulletin>(content, pageRequest, total);

        when(bulletinDao.findAll(any(Specification.class), any(PageRequest.class))).thenReturn(items);
        assertNotNull(bulletinService.getBulletins(null, pageRequest));
    }

    @Test
    public void testBuildBulletinMetricsData() throws Exception {
        List<Long> ids = new ArrayList<Long>();
        ids.add((long) 1);

        Bulletin bulletin = new Bulletin();
        bulletin.setId((long) 1);
        bulletin.setMonitorIds(ids);
        bulletin.setFields("""
            {"1": ["1", "2"]}
            """);

        BulletinMetricsData.BulletinMetricsDataBuilder contentBuilder = BulletinMetricsData.builder();

        Monitor monitor = new Monitor();

        when(realTimeDataReader.getCurrentMetricsData(any(), any(String.class))).thenReturn(null);
        when(monitorService.getMonitor(any(Long.class))).thenReturn(monitor);
        assertNotNull(bulletinService.buildBulletinMetricsData(contentBuilder, bulletin));
    }

    @Test
    public void testGetBulletinById() throws Exception {
        Bulletin bulletin = new Bulletin();
        bulletin.setId((long) 1);

        when(bulletinDao.findById((long) 1)).thenReturn(java.util.Optional.of(bulletin));
        assertEquals(bulletin, bulletinService.getBulletinById((long) 1).get());
    }

    @Test
    public void testDeleteBulletinByName() throws Exception {
        List<String> names = new ArrayList<String>();
        names.add("test");

        assertDoesNotThrow(() -> {
            bulletinService.deleteBulletinByName(names);
        });

        assertThrows(RuntimeException.class, () -> {
            doAnswer(invocation -> {
                throw new RuntimeException("test");
            }).when(bulletinDao).deleteByNameIn(anyList());

            bulletinService.deleteBulletinByName(null);
        });
    }
}
