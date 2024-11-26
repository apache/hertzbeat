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
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import org.apache.hertzbeat.common.entity.manager.ParamDefine;
import org.apache.hertzbeat.manager.AbstractSpringIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

/**
 * Test case for {@link ParamDefineDao}
 */
@Transactional
class ParamDefineDaoTest extends AbstractSpringIntegrationTest {

    @Resource
    private ParamDefineDao paramDefineDao;

    @BeforeEach
    void setUp() {
        ParamDefine paramDefine = ParamDefine.builder()
                .app("mock app")
                .field("mock field")
                .defaultValue("mock default value")
                .limit((short) 1)
                .keyAlias("mock key alias")
                .valueAlias("mock value alias")
                .options(Collections.emptyList())
                .range("mock range")
                .name(new HashMap<>())
                .hide(true)
                .required(true)
                .type("mock type")
                .placeholder("mock placeholder")
                .creator("mock creator")
                .modifier("mock modifier")
                .build();

        paramDefine = paramDefineDao.saveAndFlush(paramDefine);
        assertNotNull(paramDefine);
    }

    @AfterEach
    void tearDown() {
        paramDefineDao.deleteAll();
    }

    @Test
    void findParamDefinesByApp() {
        List<ParamDefine> paramDefineList = paramDefineDao.findParamDefinesByApp("mock app");
        assertNotNull(paramDefineList);
        assertEquals(1, paramDefineList.size());
    }
}
