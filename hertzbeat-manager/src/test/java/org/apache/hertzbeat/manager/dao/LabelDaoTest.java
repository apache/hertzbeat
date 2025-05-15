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

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import jakarta.annotation.Resource;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.apache.hertzbeat.common.entity.manager.Label;
import org.apache.hertzbeat.manager.AbstractSpringIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

/**
 * Test case for {@link LabelDao}
 */
@Transactional
class LabelDaoTest extends AbstractSpringIntegrationTest {

    @Resource
    private LabelDao labelDao;

    @BeforeEach
    void setUp() {
        Label tag = Label.builder()
                .name("mock tag")
                .tagValue("mock value")
                .type((byte) 1)
                .creator("mock creator")
                .modifier("mock modifier")
                .gmtCreate(LocalDateTime.now())
                .gmtUpdate(LocalDateTime.now())
                .build();

        tag = labelDao.saveAndFlush(tag);
        assertNotNull(tag);
    }

    @AfterEach
    void tearDown() {
        labelDao.deleteAll();
    }

    @Test
    void deleteTagsByIdIn() {
        List<Label> tagList = labelDao.findAll();

        assertNotNull(tagList);
        assertFalse(tagList.isEmpty());

        Set<Long> ids = tagList.stream().map(Label::getId).collect(Collectors.toSet());
        assertDoesNotThrow(() -> labelDao.deleteLabelsByIdIn(ids));

        tagList = labelDao.findAll();
        assertNotNull(tagList);
        assertTrue(tagList.isEmpty());
    }
}
