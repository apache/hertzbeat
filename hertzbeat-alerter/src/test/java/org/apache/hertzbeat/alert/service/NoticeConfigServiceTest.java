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

package org.apache.hertzbeat.alert.service;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.apache.hertzbeat.alert.dao.NoticeReceiverDao;
import org.apache.hertzbeat.alert.dao.NoticeRuleDao;
import org.apache.hertzbeat.alert.dao.NoticeTemplateDao;
import org.apache.hertzbeat.alert.notice.AlertNoticeDispatch;
import org.apache.hertzbeat.alert.service.NoticeTemplateMutationException.Reason;
import org.apache.hertzbeat.alert.service.impl.NoticeConfigServiceImpl;
import org.apache.hertzbeat.alert.util.NoticeReceiverMaskUtil;
import org.apache.hertzbeat.common.cache.CacheFactory;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeRule;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;


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
    AlertNoticeDispatch dispatcherAlarm;
    @InjectMocks
    private NoticeConfigServiceImpl noticeConfigService;

    private NoticeReceiver receiver1;
    private NoticeReceiver receiver2;
    private NoticeTemplate template1;
    private NoticeTemplate template2;
    private NoticeRule rule1;
    private NoticeRule rule2;

    @BeforeEach
    void setUp() {
        receiver1 = new NoticeReceiver();
        receiver1.setId(1L);
        receiver1.setName("Receiver1");

        receiver2 = new NoticeReceiver();
        receiver2.setId(2L);
        receiver2.setName("Receiver2");

        template1 = new NoticeTemplate();
        template1.setId(1L);
        template1.setName("Template1");

        template2 = new NoticeTemplate();
        template2.setId(2L);
        template2.setName("Template2");

        rule1 = new NoticeRule();
        rule1.setId(1L);
        rule1.setName("Rule1");

        rule2 = new NoticeRule();
        rule2.setId(2L);
        rule2.setName("Rule2");
    }

    @Test
    void getNoticeReceivers() {
        Page<NoticeReceiver> receiverPage = new PageImpl<>(
                Arrays.asList(receiver1, receiver2),
                PageRequest.of(0, 8, Sort.by(Sort.Direction.DESC, "id")),
                2
        );

        when(noticeReceiverDao.findAll(any(Specification.class), any(PageRequest.class))).thenReturn(receiverPage);

        Page<NoticeReceiver> result = noticeConfigService.getNoticeReceivers("Receiver", 0, 8);

        assertEquals(2, result.getTotalElements());
        assertEquals(1, result.getTotalPages());
        assertEquals(8, result.getSize());
        assertEquals(0, result.getNumber());
        assertEquals(receiver1, result.getContent().get(0));
        assertEquals(receiver2, result.getContent().get(1));

        verify(noticeReceiverDao, times(1)).findAll(any(Specification.class), any(PageRequest.class));
    }

    @Test
    void getAllNoticeReceivers() {
        when(noticeReceiverDao.findAll()).thenReturn(Arrays.asList(receiver1, receiver2));

        List<NoticeReceiver> result = noticeConfigService.getAllNoticeReceivers();

        assertEquals(2, result.size());
        assertEquals(receiver1, result.get(0));
        assertEquals(receiver2, result.get(1));

        verify(noticeReceiverDao, times(1)).findAll();
    }

    @Test
    void getNoticeTemplates() {
        Page<NoticeTemplate> templatePage = new PageImpl<>(
                Arrays.asList(template1, template2),
                PageRequest.of(0, 8, Sort.by(Sort.Direction.DESC, "id")),
                2
        );

        when(noticeTemplateDao.findAll(any(Specification.class), any(PageRequest.class))).thenReturn(templatePage);

        Page<NoticeTemplate> result = noticeConfigService.getNoticeTemplates("Template", false, 0, 8);

        assertEquals(2, result.getTotalElements());
        assertEquals(1, result.getTotalPages());
        assertEquals(8, result.getSize());
        assertEquals(0, result.getNumber());
        assertEquals(template1, result.getContent().get(0));
        assertEquals(template2, result.getContent().get(1));

        verify(noticeTemplateDao, times(1)).findAll(any(Specification.class), any(PageRequest.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    void getCustomNoticeTemplatesCombinesPresetAndNameFilters() {
        ArgumentCaptor<Specification<NoticeTemplate>> specificationCaptor =
                ArgumentCaptor.forClass(Specification.class);
        when(noticeTemplateDao.findAll(any(Specification.class), any(PageRequest.class)))
                .thenReturn(Page.empty());

        noticeConfigService.getNoticeTemplates("Template", false, 0, 8);

        verify(noticeTemplateDao).findAll(specificationCaptor.capture(), any(PageRequest.class));
        Root<NoticeTemplate> root = mock(Root.class);
        CriteriaQuery<?> query = mock(CriteriaQuery.class);
        CriteriaBuilder criteriaBuilder = mock(CriteriaBuilder.class);
        Path<Boolean> presetPath = mock(Path.class);
        Path<String> namePath = mock(Path.class);
        Expression<String> loweredName = mock(Expression.class);
        Predicate customPredicate = mock(Predicate.class);
        Predicate namePredicate = mock(Predicate.class);
        Predicate combinedPredicate = mock(Predicate.class);
        when(root.<Boolean>get("preset")).thenReturn(presetPath);
        when(root.<String>get("name")).thenReturn(namePath);
        when(criteriaBuilder.equal(presetPath, false)).thenReturn(customPredicate);
        when(criteriaBuilder.lower(namePath)).thenReturn(loweredName);
        when(criteriaBuilder.like(loweredName, "%template%")).thenReturn(namePredicate);
        when(criteriaBuilder.and(customPredicate, namePredicate)).thenReturn(combinedPredicate);

        Predicate result = specificationCaptor.getValue().toPredicate(root, query, criteriaBuilder);

        assertSame(combinedPredicate, result);
    }

    @Test
    void getAllNoticeTemplates() {
        when(noticeTemplateDao.findAll()).thenReturn(Arrays.asList(template1, template2));

        List<NoticeTemplate> result = noticeConfigService.getAllNoticeTemplates();

        assert result.size() >= 2;
        assertEquals(template1, result.get(result.size() - 2));
        assertEquals(template2, result.get(result.size() - 1));

        verify(noticeTemplateDao, times(1)).findAll();
    }

    @Test
    void getNoticeRules() {
        Page<NoticeRule> rulePage = new PageImpl<>(
                Arrays.asList(rule1, rule2),
                PageRequest.of(0, 8, Sort.by(Sort.Direction.DESC, "id")),
                2
        );

        when(noticeRuleDao.findAll(any(Specification.class), any(PageRequest.class))).thenReturn(rulePage);

        Page<NoticeRule> result = noticeConfigService.getNoticeRules("Rule", 0, 8);

        assertEquals(2, result.getTotalElements());
        assertEquals(1, result.getTotalPages());
        assertEquals(8, result.getSize());
        assertEquals(0, result.getNumber());
        assertEquals(rule1, result.getContent().get(0));
        assertEquals(rule2, result.getContent().get(1));

        verify(noticeRuleDao, times(1)).findAll(any(Specification.class), any(PageRequest.class));
    }

    @Test
    void addReceiver() {
        final NoticeReceiver noticeReceiver = mock(NoticeReceiver.class);
        noticeConfigService.addReceiver(noticeReceiver);
        verify(noticeReceiverDao, times(1)).save(noticeReceiver);
    }

    @Test
    void editReceiver() {
        final NoticeReceiver noticeReceiver = new NoticeReceiver();
        noticeReceiver.setId(5L);
        when(noticeReceiverDao.findById(5L)).thenReturn(Optional.of(noticeReceiver));
        noticeConfigService.editReceiver(noticeReceiver);
        verify(noticeReceiverDao, times(1)).save(noticeReceiver);
    }

    @Test
    void editReceiverKeepsStoredSecretWhenMasked() {
        final NoticeReceiver stored = new NoticeReceiver();
        stored.setId(5L);
        stored.setTgBotToken("1499012345:AAEOB_wEYS-DZyPM3h5NzI8voJM");
        when(noticeReceiverDao.findById(5L)).thenReturn(Optional.of(stored));

        final NoticeReceiver incoming = new NoticeReceiver();
        incoming.setId(5L);
        incoming.setTgBotToken(NoticeReceiverMaskUtil.SECRET_MASK + "voJM");

        noticeConfigService.editReceiver(incoming);

        assertEquals("1499012345:AAEOB_wEYS-DZyPM3h5NzI8voJM", incoming.getTgBotToken());
        verify(noticeReceiverDao, times(1)).save(incoming);
    }

    @Test
    void editReceiverRejectsUnknownId() {
        when(noticeReceiverDao.findById(5L)).thenReturn(Optional.empty());

        final NoticeReceiver incoming = new NoticeReceiver();
        incoming.setId(5L);
        incoming.setTgBotToken(NoticeReceiverMaskUtil.SECRET_MASK + "voJM");

        assertThrows(IllegalArgumentException.class, () -> noticeConfigService.editReceiver(incoming));
        verify(noticeReceiverDao, never()).save(any());
    }

    @Test
    void sendTestMsgResolvesMaskedSecret() {
        final NoticeReceiver stored = new NoticeReceiver();
        stored.setId(5L);
        stored.setTgBotToken("1499012345:AAEOB_wEYS-DZyPM3h5NzI8voJM");
        when(noticeReceiverDao.findById(5L)).thenReturn(Optional.of(stored));

        final NoticeReceiver incoming = new NoticeReceiver();
        incoming.setId(5L);
        incoming.setTgBotToken(NoticeReceiverMaskUtil.SECRET_MASK + "voJM");

        noticeConfigService.sendTestMsg(incoming);

        assertEquals("1499012345:AAEOB_wEYS-DZyPM3h5NzI8voJM", incoming.getTgBotToken());
    }

    @Test
    void sendTestMsgRejectsUnknownId() {
        when(noticeReceiverDao.findById(5L)).thenReturn(Optional.empty());

        final NoticeReceiver incoming = new NoticeReceiver();
        incoming.setId(5L);
        incoming.setTgBotToken(NoticeReceiverMaskUtil.SECRET_MASK + "voJM");

        assertThrows(IllegalArgumentException.class, () -> noticeConfigService.sendTestMsg(incoming));
        verify(dispatcherAlarm, never()).sendNoticeMsg(any(), any(), any());
    }

    @Test
    void sendTestMsgRejectsMaskedSecretReplayToChangedWebhookUrl() {
        final NoticeReceiver stored = new NoticeReceiver();
        stored.setId(5L);
        stored.setType((byte) 2);
        stored.setHookUrl("https://trusted.example/hook");
        stored.setHookAuthToken("hook-auth-token-abcd");
        when(noticeReceiverDao.findById(5L)).thenReturn(Optional.of(stored));

        final NoticeReceiver incoming = NoticeReceiverMaskUtil.mask(stored);
        incoming.setHookUrl("https://attacker.example/collect");

        assertThrows(IllegalArgumentException.class, () -> noticeConfigService.sendTestMsg(incoming));
        verify(dispatcherAlarm, never()).sendNoticeMsg(any(), any(), any());
    }

    @Test
    void sendTestMsgRejectsBareMaskReplayToChangedWebhookUrl() {
        final NoticeReceiver stored = new NoticeReceiver();
        stored.setId(5L);
        stored.setType((byte) 2);
        stored.setHookUrl("https://trusted.example/hook");
        stored.setHookAuthToken("hook-auth-token-abcd");
        when(noticeReceiverDao.findById(5L)).thenReturn(Optional.of(stored));

        final NoticeReceiver incoming = new NoticeReceiver();
        incoming.setId(5L);
        incoming.setType((byte) 2);
        incoming.setHookUrl("https://attacker.example/collect");
        incoming.setHookAuthToken(NoticeReceiverMaskUtil.SECRET_MASK);

        assertThrows(IllegalArgumentException.class, () -> noticeConfigService.sendTestMsg(incoming));
        verify(dispatcherAlarm, never()).sendNoticeMsg(any(), any(), any());
    }

    @Test
    void deleteReceiver() {
        final Long receiverId = 23342525L;
        noticeConfigService.deleteReceiver(receiverId);
        verify(noticeReceiverDao, times(1)).deleteById(receiverId);
    }

    @Test
    void addTemplate() {
        final NoticeTemplate noticeTemplate = NoticeTemplate.builder()
                .name("custom")
                .type((byte) 1)
                .content("content")
                .build();
        noticeConfigService.addNoticeTemplate(noticeTemplate);
        verify(noticeTemplateDao, times(1)).save(any(NoticeTemplate.class));
    }

    @Test
    void addNoticeTemplateRejectsCallerOwnedIdentityAndPresetState() {
        NoticeTemplate noticeTemplate = NoticeTemplate.builder()
                .id(87584674384L)
                .name("private-template")
                .type((byte) 1)
                .preset(true)
                .content("private-template-payload")
                .build();

        NoticeTemplateMutationException exception = assertThrows(NoticeTemplateMutationException.class,
                () -> noticeConfigService.addNoticeTemplate(noticeTemplate));

        assertEquals(Reason.INVALID_REQUEST, exception.getReason());
        verifyNoInteractions(noticeTemplateDao);
    }

    @Test
    void editTemplate() {
        final NoticeTemplate noticeTemplate = NoticeTemplate.builder()
                .id(23342525L)
                .name("updated")
                .type((byte) 1)
                .content("updated content")
                .build();
        NoticeTemplate persisted = NoticeTemplate.builder().id(23342525L).preset(false).build();
        when(noticeTemplateDao.findByIdForUpdate(23342525L)).thenReturn(java.util.Optional.of(persisted));
        noticeConfigService.editNoticeTemplate(noticeTemplate);
        verify(noticeTemplateDao, times(1)).save(persisted);
    }

    @Test
    void editNoticeTemplateRejectsMissingTargetBeforeWrite() {
        NoticeTemplate noticeTemplate = NoticeTemplate.builder()
                .id(87584674384L)
                .name("updated")
                .type((byte) 1)
                .content("updated content")
                .build();
        when(noticeTemplateDao.findByIdForUpdate(87584674384L)).thenReturn(java.util.Optional.empty());

        NoticeTemplateMutationException exception = assertThrows(NoticeTemplateMutationException.class,
                () -> noticeConfigService.editNoticeTemplate(noticeTemplate));

        assertEquals(Reason.NOT_FOUND, exception.getReason());
        verify(noticeTemplateDao, never()).save(any());
    }

    @Test
    void editNoticeTemplateUpdatesOnlyTheLockedExactCustomTarget() {
        NoticeTemplate persisted = NoticeTemplate.builder()
                .id(87584674384L)
                .name("existing")
                .type((byte) 2)
                .content("existing content")
                .creator("trusted-creator")
                .preset(false)
                .build();
        NoticeTemplate request = NoticeTemplate.builder()
                .id(87584674384L)
                .name("updated")
                .type((byte) 1)
                .content("updated content")
                .creator("private-spoofed-creator")
                .preset(false)
                .build();
        when(noticeTemplateDao.findByIdForUpdate(87584674384L)).thenReturn(java.util.Optional.of(persisted));

        noticeConfigService.editNoticeTemplate(request);

        assertEquals("updated", persisted.getName());
        assertEquals((byte) 1, persisted.getType());
        assertEquals("updated content", persisted.getContent());
        assertEquals("trusted-creator", persisted.getCreator());
        verify(noticeTemplateDao).save(persisted);
        verify(noticeTemplateDao, never()).save(request);
    }

    @Test
    void editNoticeTemplateRejectsPresetMutationBeforeWrite() {
        NoticeTemplate persisted = NoticeTemplate.builder()
                .id(87584674384L)
                .preset(false)
                .build();
        NoticeTemplate request = NoticeTemplate.builder()
                .id(87584674384L)
                .preset(true)
                .build();
        when(noticeTemplateDao.findByIdForUpdate(87584674384L)).thenReturn(java.util.Optional.of(persisted));

        NoticeTemplateMutationException exception = assertThrows(NoticeTemplateMutationException.class,
                () -> noticeConfigService.editNoticeTemplate(request));

        assertEquals(Reason.READ_ONLY, exception.getReason());
        verify(noticeTemplateDao, never()).save(any());
    }

    @Test
    void deleteTemplate() {
        final Long templateId = 23342525L;
        NoticeTemplate persisted = NoticeTemplate.builder().id(templateId).preset(false).build();
        when(noticeTemplateDao.findByIdForUpdate(templateId)).thenReturn(java.util.Optional.of(persisted));
        noticeConfigService.deleteNoticeTemplate(templateId);
        verify(noticeTemplateDao, times(1)).delete(persisted);
    }

    @Test
    void deleteNoticeTemplateRejectsMissingTargetBeforeWrite() {
        long templateId = 87584674384L;
        when(noticeTemplateDao.findByIdForUpdate(templateId)).thenReturn(java.util.Optional.empty());

        NoticeTemplateMutationException exception = assertThrows(NoticeTemplateMutationException.class,
                () -> noticeConfigService.deleteNoticeTemplate(templateId));

        assertEquals(Reason.NOT_FOUND, exception.getReason());
        verify(noticeTemplateDao, never()).delete(any(NoticeTemplate.class));
        verify(noticeTemplateDao, never()).deleteById(any());
    }

    @Test
    void deleteNoticeTemplateRejectsLockedPresetTargetBeforeWrite() {
        long templateId = 87584674384L;
        NoticeTemplate persisted = NoticeTemplate.builder().id(templateId).preset(true).build();
        when(noticeTemplateDao.findByIdForUpdate(templateId)).thenReturn(java.util.Optional.of(persisted));

        NoticeTemplateMutationException exception = assertThrows(NoticeTemplateMutationException.class,
                () -> noticeConfigService.deleteNoticeTemplate(templateId));

        assertEquals(Reason.READ_ONLY, exception.getReason());
        verify(noticeTemplateDao, never()).delete(any(NoticeTemplate.class));
        verify(noticeTemplateDao, never()).deleteById(any());
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
    void getReceiverById() {
        final Long receiverId = 343432325L;
        noticeConfigService.getReceiverById(receiverId);
        verify(noticeReceiverDao, times(1)).findById(receiverId);
    }

    @Test
    void getNoticeRulesById() {
        final Long receiverId = 343432325L;
        noticeConfigService.getNoticeRulesById(receiverId);
        verify(noticeRuleDao, times(1)).findById(receiverId);
    }

    @Test
    void getNoticeTemplateById() {
        final Long templateId = 343432325L;
        noticeConfigService.getNoticeTemplatesById(templateId);
        verify(noticeTemplateDao, times(1)).findById(templateId);
    }

    @Test
    void sendTestMsg() {
        final NoticeReceiver noticeReceiver = new NoticeReceiver();
        final NoticeTemplate noticeTemplate = null;
        noticeConfigService.sendTestMsg(noticeReceiver);
        verify(dispatcherAlarm, times(1)).sendNoticeMsg(eq(noticeReceiver), eq(noticeTemplate), any(GroupAlert.class));
    }

    @AfterEach
    void tearDown() {
        CacheFactory.clearNoticeCache();
    }

    private GroupAlert buildGroupAlertWithPartialLabel() {
        SingleAlert alertA = SingleAlert.builder()
                .labels(new HashMap<>(Map.of("alertname", "cpu", "instance", "s1", "department", "algorithm")))
                .build();
        SingleAlert alertB = SingleAlert.builder()
                .labels(new HashMap<>(Map.of("alertname", "cpu", "instance", "s2")))
                .build();
        return GroupAlert.builder()
                .commonLabels(new HashMap<>(Map.of("alertname", "cpu")))
                .alerts(Arrays.asList(alertA, alertB))
                .build();
    }

    /**
     * A rule scoped to a label carried by only part of the group's alerts must still match,
     * even though that label is absent from commonLabels. Regression test for issue #3852.
     */
    @Test
    void getReceiverFilterRuleMatchesLabelOnPartialAlert() {
        NoticeRule rule = new NoticeRule();
        rule.setId(1L);
        rule.setName("algorithm-team");
        rule.setFilterAll(false);
        rule.setLabels(new HashMap<>(Map.of("department", "algorithm")));
        CacheFactory.setNoticeCache(List.of(rule));

        List<NoticeRule> matched = noticeConfigService.getReceiverFilterRule(buildGroupAlertWithPartialLabel());

        assertEquals(1, matched.size());
        assertEquals(1L, matched.get(0).getId());
    }

    /**
     * A rule whose label value is not present on any alert in the group must not match.
     */
    @Test
    void getReceiverFilterRuleSkipsRuleWithUnmatchedLabel() {
        NoticeRule rule = new NoticeRule();
        rule.setId(2L);
        rule.setName("infra-team");
        rule.setFilterAll(false);
        rule.setLabels(new HashMap<>(Map.of("department", "infra")));
        CacheFactory.setNoticeCache(List.of(rule));

        List<NoticeRule> matched = noticeConfigService.getReceiverFilterRule(buildGroupAlertWithPartialLabel());

        assertTrue(matched.isEmpty());
    }

    /**
     * A rule requiring several labels matches only when a single alert carries all of them,
     * preventing false matches assembled across different alerts in the group.
     */
    @Test
    void getReceiverFilterRuleRequiresAllLabelsOnSameAlert() {
        NoticeRule rule = new NoticeRule();
        rule.setId(3L);
        rule.setName("algorithm-on-s2");
        rule.setFilterAll(false);
        rule.setLabels(new HashMap<>(Map.of("department", "algorithm", "instance", "s2")));
        CacheFactory.setNoticeCache(List.of(rule));

        List<NoticeRule> matched = noticeConfigService.getReceiverFilterRule(buildGroupAlertWithPartialLabel());

        assertTrue(matched.isEmpty());
    }

    /**
     * A forward-all rule keeps matching regardless of labels.
     */
    @Test
    void getReceiverFilterRuleForwardAllAlwaysMatches() {
        NoticeRule rule = new NoticeRule();
        rule.setId(4L);
        rule.setName("forward-all");
        rule.setFilterAll(true);
        CacheFactory.setNoticeCache(List.of(rule));

        List<NoticeRule> matched = noticeConfigService.getReceiverFilterRule(buildGroupAlertWithPartialLabel());

        assertEquals(1, matched.size());
        assertEquals(4L, matched.get(0).getId());
    }

    @Test
    void getReceiverFilterRuleMatchesPeriodContainingNow() {
        ZonedDateTime now = ZonedDateTime.now();
        List<NoticeRule> matched = filterWithPeriod(now.minusHours(6), now.plusHours(6));
        assertEquals(1, matched.size());
    }

    @Test
    void getReceiverFilterRuleFiltersPeriodExcludingNow() {
        ZonedDateTime now = ZonedDateTime.now();
        List<NoticeRule> matched = filterWithPeriod(now.plusHours(1), now.plusHours(2));
        assertEquals(0, matched.size());
    }

    @Test
    void getReceiverFilterRuleMatchesCrossMidnightPeriod() {
        ZonedDateTime now = ZonedDateTime.now();
        List<NoticeRule> matched = filterWithPeriod(now.minusHours(1), now.minusHours(2).plusDays(1));
        assertEquals(1, matched.size());
    }

    @Test
    void getReceiverFilterRuleNormalizesStoredOffsetToServerZone() {
        ZonedDateTime now = ZonedDateTime.now();
        List<NoticeRule> matched = filterWithPeriod(
                now.minusHours(6).withZoneSameInstant(ZoneOffset.ofHours(-7)),
                now.plusHours(6).withZoneSameInstant(ZoneOffset.ofHours(9)));
        assertEquals(1, matched.size());
    }

    private List<NoticeRule> filterWithPeriod(ZonedDateTime periodStart, ZonedDateTime periodEnd) {
        NoticeRule rule = new NoticeRule();
        rule.setId(10L);
        rule.setName("PeriodRule");
        rule.setFilterAll(true);
        rule.setPeriodStart(periodStart);
        rule.setPeriodEnd(periodEnd);
        CacheFactory.clearNoticeCache();
        when(noticeRuleDao.findNoticeRulesByEnableTrue()).thenReturn(Collections.singletonList(rule));
        return noticeConfigService.getReceiverFilterRule(new GroupAlert());
    }
}
