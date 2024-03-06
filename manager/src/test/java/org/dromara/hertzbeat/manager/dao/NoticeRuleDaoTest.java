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

package org.dromara.hertzbeat.manager.dao;

import org.dromara.hertzbeat.common.entity.manager.NoticeRule;
import org.dromara.hertzbeat.manager.AbstractSpringIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.Resource;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Test case for {@link NoticeRuleDao}
 */
@Transactional
class NoticeRuleDaoTest extends AbstractSpringIntegrationTest {

    @Resource
    private NoticeRuleDao noticeRuleDao;

    @BeforeEach
    void setUp() {
        // insert notice rule with enable = true
        NoticeRule enabled = NoticeRule.builder()
                .name("mock notice rule")
                .enable(true)
                .filterAll(true)
                .gmtCreate(LocalDateTime.now())
                .gmtUpdate(LocalDateTime.now())
                .modifier("mock")
                .creator("mock")
                .priorities(Collections.emptyList())
                .receiverId(1L)
                .receiverName("mock receiver")
                .templateId(1L)
                .receiverName("mock template")
                .tags(Collections.emptyList())
                .build();
        enabled = noticeRuleDao.saveAndFlush(enabled);
        assertNotNull(enabled);

        // insert notice rule with enable = false
        NoticeRule disabled = NoticeRule.builder()
                .id(2L)
                .name("mock notice rule")
                .enable(false)
                .filterAll(true)
                .gmtCreate(LocalDateTime.now())
                .gmtUpdate(LocalDateTime.now())
                .modifier("mock")
                .creator("mock")
                .priorities(Collections.emptyList())
                .receiverId(1L)
                .receiverName("mock receiver")
                .templateId(1L)
                .receiverName("mock template")
                .tags(Collections.emptyList())
                .build();
        disabled = noticeRuleDao.saveAndFlush(disabled);
        assertNotNull(disabled);
    }

    @AfterEach
    void tearDown() {
        noticeRuleDao.deleteAll();
    }

    @Test
    void findNoticeRulesByEnableTrue() {
        List<NoticeRule> enabledList = noticeRuleDao.findNoticeRulesByEnableTrue();
        assertNotNull(enabledList);
        assertEquals(1, enabledList.size());
    }
}