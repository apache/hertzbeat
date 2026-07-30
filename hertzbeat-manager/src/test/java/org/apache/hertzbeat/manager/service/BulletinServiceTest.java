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

import org.apache.hertzbeat.common.entity.manager.Bulletin;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.dao.BulletinDao;
import org.apache.hertzbeat.manager.service.impl.BulletinServiceImpl;
import org.apache.hertzbeat.warehouse.store.realtime.RealTimeDataReader;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
            bulletinService.validate(new Bulletin());
        });

        assertThrows(IllegalArgumentException.class, () -> {
            Bulletin obj = new Bulletin();
            obj.setApp("app");
            bulletinService.validate(obj);
        });

        assertThrows(IllegalArgumentException.class, () -> {
            Map<String, List<String>> fields = new HashMap<String, List<String>>();
            fields.put("field1", null);

            Bulletin obj = new Bulletin();
            obj.setApp("app");
            obj.setFields(fields);
            bulletinService.validate(obj);
        });

        assertDoesNotThrow(() -> {
            Map<String, List<String>> fields = new HashMap<String, List<String>>();
            fields.put("field1", null);

            List<Long> ids = new ArrayList<Long>();
            ids.add((long) 1);

            Bulletin obj = new Bulletin();
            obj.setApp("app");
            obj.setFields(fields);
            obj.setMonitorIds(ids);
            bulletinService.validate(obj);
        });
    }

    @Test
    public void testAddBulletin() throws Exception {
        Map<String, List<String>> fields = new HashMap<String, List<String>>();
        fields.put("field1", null);

        Bulletin bulletinDto = new Bulletin();
        bulletinDto.setApp("app");
        bulletinDto.setFields(fields);

        assertDoesNotThrow(() -> {
            bulletinService.addBulletin(bulletinDto);
        });
    }

    @Test
    void addBulletinIgnoresClientManagedFields() {
        Bulletin bulletin = new Bulletin();
        bulletin.setId(7L);
        bulletin.setCreator("submitted-creator");
        bulletin.setModifier("submitted-modifier");
        bulletin.setGmtCreate(LocalDateTime.of(2020, 1, 1, 0, 0));
        bulletin.setGmtUpdate(LocalDateTime.of(2020, 1, 2, 0, 0));

        bulletinService.addBulletin(bulletin);

        ArgumentCaptor<Bulletin> saved = ArgumentCaptor.forClass(Bulletin.class);
        verify(bulletinDao).save(saved.capture());
        assertNull(saved.getValue().getId());
        assertNull(saved.getValue().getCreator());
        assertNull(saved.getValue().getModifier());
        assertNull(saved.getValue().getGmtCreate());
        assertNull(saved.getValue().getGmtUpdate());
    }

    @Test
    void editBulletinPreservesStoredManagedFields() {
        LocalDateTime createdAt = LocalDateTime.of(2020, 1, 1, 0, 0);
        LocalDateTime updatedAt = LocalDateTime.of(2020, 1, 2, 0, 0);
        Bulletin stored = Bulletin.builder()
                .id(7L)
                .name("old-name")
                .creator("stored-creator")
                .modifier("stored-modifier")
                .gmtCreate(createdAt)
                .gmtUpdate(updatedAt)
                .build();
        Bulletin submitted = Bulletin.builder()
                .id(7L)
                .name("new-name")
                .creator("submitted-creator")
                .modifier("submitted-modifier")
                .gmtCreate(createdAt.minusYears(1))
                .gmtUpdate(updatedAt.minusYears(1))
                .build();
        when(bulletinDao.findById(7L)).thenReturn(Optional.of(stored));

        bulletinService.editBulletin(submitted);

        ArgumentCaptor<Bulletin> saved = ArgumentCaptor.forClass(Bulletin.class);
        verify(bulletinDao).save(saved.capture());
        assertSame(stored, saved.getValue());
        assertEquals("new-name", saved.getValue().getName());
        assertEquals("stored-creator", saved.getValue().getCreator());
        assertEquals("stored-modifier", saved.getValue().getModifier());
        assertEquals(createdAt, saved.getValue().getGmtCreate());
        assertEquals(updatedAt, saved.getValue().getGmtUpdate());
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
        assertNotNull(bulletinService.getBulletins(null, null, null));
    }

    @Test
    public void testBuildBulletinMetricsData() throws Exception {
        List<Long> ids = new ArrayList<Long>();
        ids.add((long) 1);
        Bulletin bulletin = new Bulletin();
        bulletin.setId((long) 1);
        bulletin.setMonitorIds(ids);
        HashMap<String, List<String>> fields = new HashMap<>();
        fields.put("1", List.of("1", "2"));
        bulletin.setFields(fields);

        Monitor monitor = new Monitor();

        when(bulletinDao.findById(any(Long.class))).thenReturn(java.util.Optional.of(bulletin));
        when(realTimeDataReader.getCurrentMetricsData(any(), any(String.class))).thenReturn(null);

        when(monitorService.getMonitor(any(Long.class))).thenReturn(null);
        assertTrue(bulletinService.buildBulletinMetricsData(any(Long.class)).getContent().isEmpty());

        when(monitorService.getMonitor(1L)).thenReturn(monitor);
        assertFalse(bulletinService.buildBulletinMetricsData(2L).getContent().isEmpty());

    }

    @Test
    public void testGetBulletinById() throws Exception {
        Bulletin bulletin = new Bulletin();
        bulletin.setId((long) 1);

        when(bulletinDao.findById((long) 1)).thenReturn(java.util.Optional.of(bulletin));
        assertEquals(bulletin, bulletinService.getBulletinById((long) 1).get());
    }
}
