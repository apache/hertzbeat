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

package org.dromara.hertzbeat.manager.service;

import com.google.common.collect.Lists;
import org.assertj.core.util.Maps;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.entity.manager.NoticeReceiver;
import org.dromara.hertzbeat.common.entity.manager.NoticeRule;
import org.dromara.hertzbeat.common.entity.manager.NoticeTemplate;
import org.dromara.hertzbeat.common.entity.manager.TagItem;
import org.dromara.hertzbeat.manager.component.alerter.DispatcherAlarm;
import org.dromara.hertzbeat.manager.dao.NoticeReceiverDao;
import org.dromara.hertzbeat.manager.dao.NoticeRuleDao;
import org.dromara.hertzbeat.manager.dao.NoticeTemplateDao;
import org.dromara.hertzbeat.manager.service.impl.NoticeConfigServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Test case for {@link NoticeConfigService}
 */
@ExtendWith(MockitoExtension.class)
class NoticeConfigServiceTest {

    @Mock
    NoticeReceiverDao noticeReceiverDao;
    @Mock
    NoticeTemplateDao noticeTemplateDao;
    @Mock
    NoticeRuleDao noticeRuleDao;
    @Mock
    DispatcherAlarm dispatcherAlarm;
    @InjectMocks
    private NoticeConfigServiceImpl noticeConfigService;

    @BeforeEach
    void setUp() {
    }

    @Test
    void getNoticeReceivers() {
        final Specification<NoticeReceiver> specification = mock(Specification.class);
        noticeConfigService.getNoticeReceivers(specification);
        verify(noticeReceiverDao, times(1)).findAll(specification);
    }

    @Test
    void getNoticeTemplates() {
        final Specification<NoticeTemplate> specification = mock(Specification.class);
        noticeConfigService.getNoticeTemplates(specification);
        verify(noticeTemplateDao, times(1)).findAll(specification);
    }

    @Test
    void getNoticeRules() {
        final Specification<NoticeRule> specification = mock(Specification.class);
        noticeConfigService.getNoticeRules(specification);
        verify(noticeRuleDao, times(1)).findAll(specification);
    }

    @Test
    void addReceiver() {
        final NoticeReceiver noticeReceiver = mock(NoticeReceiver.class);
        noticeConfigService.addReceiver(noticeReceiver);
        verify(noticeReceiverDao, times(1)).save(noticeReceiver);
    }

    @Test
    void editReceiver() {
        final NoticeReceiver noticeReceiver = mock(NoticeReceiver.class);
        noticeConfigService.editReceiver(noticeReceiver);
        verify(noticeReceiverDao, times(1)).save(noticeReceiver);
    }

    @Test
    void deleteReceiver() {
        final Long receiverId = 23342525L;
        noticeConfigService.deleteReceiver(receiverId);
        verify(noticeReceiverDao, times(1)).deleteById(receiverId);
    }

    @Test
    void addTemplate() {
        final NoticeTemplate noticeTemplate = mock(NoticeTemplate.class);
        noticeConfigService.addNoticeTemplate(noticeTemplate);
        verify(noticeTemplateDao, times(1)).save(noticeTemplate);
    }

    @Test
    void editTemplate() {
        final NoticeTemplate noticeTemplate = mock(NoticeTemplate.class);
        noticeConfigService.editNoticeTemplate(noticeTemplate);
        verify(noticeTemplateDao, times(1)).save(noticeTemplate);
    }

    @Test
    void deleteTemplate() {
        final Long templateId = 23342525L;
        noticeConfigService.deleteNoticeTemplate(templateId);
        verify(noticeTemplateDao, times(1)).deleteById(templateId);
    }

    @Test
    void addNoticeRule() {
        final NoticeRule noticeRule = mock(NoticeRule.class);
        noticeConfigService.addNoticeRule(noticeRule);
        verify(noticeRuleDao, times(1)).save(noticeRule);
    }

    @Test
    void editNoticeRule() {
        final NoticeRule noticeRule = mock(NoticeRule.class);
        noticeConfigService.editNoticeRule(noticeRule);
        verify(noticeRuleDao, times(1)).save(noticeRule);
    }

    @Test
    void deleteNoticeRule() {
        final Long ruleId = 23342525L;
        noticeConfigService.deleteNoticeRule(ruleId);
        verify(noticeRuleDao, times(1)).deleteById(ruleId);
    }

    @Test
    void getReceiverFilterRule() {
        Alert alert = mock(Alert.class);

        final Byte priority = 0x1;
        final Byte priorityFail = 0x2;
        final String tagName = "tagName";
        final String tagNameFail = "tagNameFail";
        final String tagValue = "tagValue";
        final List<Byte> priorities = Lists.newArrayList(priority);
        final List<Byte> prioritiesFail = Lists.newArrayList(priorityFail);
        final List<TagItem> tags = Lists.newArrayList(new TagItem(tagName, tagValue));
        final List<TagItem> tagsFail = Lists.newArrayList(new TagItem(tagNameFail, tagValue));
        final Map<String, String> tagsMap = Maps.newHashMap(tagName, tagValue);
        final NoticeRule rule1 = NoticeRule.builder()
                .id(1L)
                .filterAll(true)
                .priorities(priorities)
                .receiverId(1L)
                .build();
        final NoticeRule rule2 = NoticeRule.builder()
                .id(2L)
                .filterAll(false)
                .priorities(prioritiesFail)
                .receiverId(2L)
                .build();
        final NoticeRule rule3 = NoticeRule.builder()
                .id(3L)
                .filterAll(false)
                .priorities(priorities)
                .tags(tagsFail)
                .receiverId(3L)
                .build();
        final NoticeRule rule4 = NoticeRule.builder()
                .id(4L)
                .filterAll(false)
                .priorities(priorities)
                .tags(tags)
                .receiverId(4L)
                .build();
        final List<NoticeRule> rules = Lists.newArrayList(rule1, rule2, rule3, rule4);

        lenient().when(noticeRuleDao.findNoticeRulesByEnableTrue()).thenReturn(rules);
        lenient().when(alert.getPriority()).thenReturn(priority);
        lenient().when(alert.getTags()).thenReturn(tagsMap);

        List<NoticeRule> ruleList = noticeConfigService.getReceiverFilterRule(alert);
        assertEquals(2, ruleList.size());
    }

    @Test
    void getReceiverById() {
        final Long receiverId = 343432325L;
        noticeConfigService.getReceiverById(receiverId);
        verify(noticeReceiverDao, times(1)).getReferenceById(receiverId);
    }

    @Test
    void getNoticeRulesById() {
        final Long receiverId = 343432325L;
        noticeConfigService.getNoticeRulesById(receiverId);
        verify(noticeRuleDao, times(1)).getReferenceById(receiverId);
    }

    @Test
    void getNoticeTemplateById() {
        final Long templateId = 343432325L;
        noticeConfigService.getNoticeTemplatesById(templateId);
        verify(noticeTemplateDao, times(1)).findById(templateId);
    }

    @Test
    void sendTestMsg() {
        final NoticeReceiver noticeReceiver = mock(NoticeReceiver.class);
        final NoticeTemplate noticeTemplate = null;
        noticeConfigService.sendTestMsg(noticeReceiver);
        verify(dispatcherAlarm, times(1)).sendNoticeMsg(eq(noticeReceiver), eq(noticeTemplate), any(Alert.class));
    }
}
