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

package org.apache.hertzbeat.push.dao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * test case for {@link PushMonitorDao}
 */

@ExtendWith(MockitoExtension.class)
public class PushMonitorDaoTest {
    @Mock
    private PushMonitorDao pushMonitorDao;

    @InjectMocks
    private PushMonitorDaoTest pushMonitorDaoTest;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shallSaveMonitor() {

        Monitor monitor = new Monitor();
        monitor.setId(1L);
        monitor.setName("Test Monitor");

        when(pushMonitorDao.save(any(Monitor.class))).thenReturn(monitor);

        Monitor savedMonitor = pushMonitorDao.save(monitor);

        assertEquals(monitor, savedMonitor);
        verify(pushMonitorDao, times(1)).save(monitor);
    }

    @Test
    void shallFindById() {
        Monitor monitor = new Monitor();
        monitor.setId(1L);
        monitor.setName("Test Monitor");

        when(pushMonitorDao.findById(1L)).thenReturn(Optional.of(monitor));

        Optional<Monitor> foundMonitor = pushMonitorDao.findById(1L);

        assertTrue(foundMonitor.isPresent());
        assertEquals(monitor, foundMonitor.get());
        verify(pushMonitorDao, times(1)).findById(1L);
    }

    @Test
    void shallDeleteById() {
        doNothing().when(pushMonitorDao).deleteById(1L);

        pushMonitorDao.deleteById(1L);

        verify(pushMonitorDao, times(1)).deleteById(1L);
    }
}
