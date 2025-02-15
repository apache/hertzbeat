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

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;
import javax.annotation.Resource;
import org.apache.hertzbeat.common.entity.manager.Collector;
import org.apache.hertzbeat.manager.AbstractSpringIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Test case for {@link CollectorDao}
 */
@Transactional
public class CollectorDaoTest extends AbstractSpringIntegrationTest {

    @Resource
    private CollectorDao collectorDao;


    @BeforeEach
    void setUp() {
        Collector creator = Collector.builder()
                .id(1L)
                .name("test")
                .mode("public")
                .status((byte) 1)
                .ip("192.34.5.43")
                .creator("tom")
                .build();
        creator = collectorDao.save(creator);
        assertNotNull(creator);
    }

    @AfterEach
    public void deleteAll() {
        collectorDao.deleteAll();
    }

    @Test
    public void deleteCollectorByName() {
        collectorDao.deleteCollectorByName("test");
    }

    @Test
    public void findCollectorByName() {
        assertTrue(collectorDao.findCollectorByName("test").isPresent());
    }

    @Test
    public void findCollectorsByNameIn(){
        assertFalse(collectorDao.findCollectorsByNameIn(List.of("test")).isEmpty());
    }
}
