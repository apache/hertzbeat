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

package org.apache.hertzbeat.manager.component.migration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.dao.ParamDao;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SftpHostKeyCompatibilityMigrationTest {

    @Mock
    private MonitorDao monitorDao;

    @Mock
    private ParamDao paramDao;

    @InjectMocks
    private SftpHostKeyCompatibilityMigration migration;

    @Test
    void preservesAnExistingSftpMonitorWithAnExplicitTemporaryCompatibilityFlag() throws Exception {
        Monitor monitor = Monitor.builder().id(100L).app("ftp").build();
        when(monitorDao.findMonitorsByAppEquals("ftp")).thenReturn(List.of(monitor));
        when(paramDao.findParamsByMonitorId(100L)).thenReturn(List.of(
                Param.builder().monitorId(100L).field("ssl").paramValue("true").build()));
        ArgumentCaptor<Param> paramCaptor = ArgumentCaptor.forClass(Param.class);

        migration.run();

        verify(paramDao).save(paramCaptor.capture());
        Param migrated = paramCaptor.getValue();
        assertEquals(100L, migrated.getMonitorId());
        assertEquals("insecureSkipVerify", migrated.getField());
        assertEquals("true", migrated.getParamValue());
    }

    @Test
    void leavesPinnedAndAlreadyMigratedSftpMonitorsUnchanged() throws Exception {
        Monitor pinned = Monitor.builder().id(101L).app("ftp").build();
        Monitor migrated = Monitor.builder().id(102L).app("ftp").build();
        when(monitorDao.findMonitorsByAppEquals("ftp")).thenReturn(List.of(pinned, migrated));
        when(paramDao.findParamsByMonitorId(101L)).thenReturn(List.of(
                Param.builder().monitorId(101L).field("ssl").paramValue("true").build(),
                Param.builder().monitorId(101L).field("hostKeyFingerprint")
                        .paramValue("SHA256:pinned").build()));
        when(paramDao.findParamsByMonitorId(102L)).thenReturn(List.of(
                Param.builder().monitorId(102L).field("ssl").paramValue("true").build(),
                Param.builder().monitorId(102L).field("insecureSkipVerify")
                        .paramValue("true").build()));

        migration.run();

        verify(paramDao, never()).save(org.mockito.ArgumentMatchers.any());
    }
}
