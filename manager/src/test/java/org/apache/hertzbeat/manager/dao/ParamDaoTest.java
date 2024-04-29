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

package org.apache.hertzbeat.manager.dao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import jakarta.annotation.Resource;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.manager.AbstractSpringIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

/**
 * Test case for {@link ParamDao}
 */
@Transactional
class ParamDaoTest extends AbstractSpringIntegrationTest {

    @Resource
    private ParamDao paramDao;

    @BeforeEach
    void setUp() {
        Param param = Param.builder()
                .field("mock field")
                .paramValue("mock value")
                .gmtCreate(LocalDateTime.now())
                .gmtUpdate(LocalDateTime.now())
                .monitorId(1L)
                .type((byte) 1)
                .build();

        param = paramDao.saveAndFlush(param);
        assertNotNull(param);
    }

    @AfterEach
    void tearDown() {
        paramDao.deleteAll();
    }

    @Test
    void findParamsByMonitorId() {
        List<Param> paramList = paramDao.findParamsByMonitorId(1L);
        assertNotNull(paramList);

        assertEquals(1L, paramList.size());
    }

    @Test
    void deleteParamsByMonitorId() {
        // make sure params size is correct
        List<Param> paramList = paramDao.findParamsByMonitorId(1L);
        assertNotNull(paramList);

        assertEquals(1L, paramList.size());

        // delete params by monitor id when monitor id is wrong
        paramDao.deleteParamsByMonitorId(2L);
        paramList = paramDao.findParamsByMonitorId(1L);
        assertNotNull(paramList);

        assertEquals(1L, paramList.size());

        // delete params by monitor id when monitor id is true
        paramDao.deleteParamsByMonitorId(1L);
        paramList = paramDao.findParamsByMonitorId(1L);
        assertNotNull(paramList);

        assertEquals(0L, paramList.size());
    }

    @Test
    void deleteParamsByMonitorIdIn() {
        // make sure params size is correct
        List<Param> paramList = paramDao.findParamsByMonitorId(1L);
        assertNotNull(paramList);

        assertEquals(1L, paramList.size());

        // delete params by monitor id when monitor id is wrong
        Set<Long> ids = new HashSet<>();
        ids.add(2L);
        paramDao.deleteParamsByMonitorIdIn(ids);
        paramList = paramDao.findParamsByMonitorId(1L);
        assertNotNull(paramList);

        assertEquals(1L, paramList.size());

        // delete params by monitor id when monitor id is true
        ids.add(1L);
        paramDao.deleteParamsByMonitorId(1L);
        paramList = paramDao.findParamsByMonitorId(1L);
        assertNotNull(paramList);

        assertEquals(0L, paramList.size());
    }
}
