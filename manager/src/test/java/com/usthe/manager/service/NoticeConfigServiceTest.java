package com.usthe.manager.service;

import com.google.common.collect.Lists;
import com.google.common.collect.Sets;
import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.manager.NoticeReceiver;
import com.usthe.common.entity.manager.NoticeRule;
import com.usthe.common.entity.manager.NoticeRule.TagItem;
import com.usthe.manager.component.alerter.DispatcherAlarm;
import com.usthe.manager.dao.NoticeReceiverDao;
import com.usthe.manager.dao.NoticeRuleDao;
import com.usthe.manager.service.impl.NoticeConfigServiceImpl;
import org.assertj.core.util.Maps;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * Test case for {@link NoticeConfigService}
 */
@ExtendWith(MockitoExtension.class)
class NoticeConfigServiceTest {

    @InjectMocks
    private NoticeConfigServiceImpl noticeConfigService;

    @Mock
    NoticeReceiverDao noticeReceiverDao;

    @Mock
    NoticeRuleDao noticeRuleDao;

    @Mock
    DispatcherAlarm dispatcherAlarm;

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

        noticeConfigService.getReceiverFilterRule(alert);
        final Set<Long> sets = Sets.newHashSet(1L, 4L);
        verify(noticeReceiverDao, times(1)).findAllById(sets);
    }

    @Test
    void getReceiverById() {
        final Long receiverId = 343432325L;
        noticeConfigService.getReceiverById(receiverId);
        verify(noticeReceiverDao, times(1)).getOne(receiverId);
    }

    @Test
    void getNoticeRulesById() {
        final Long receiverId = 343432325L;
        noticeConfigService.getNoticeRulesById(receiverId);
        verify(noticeRuleDao, times(1)).getOne(receiverId);
    }

    @Test
    void sendTestMsg() {
        final NoticeReceiver noticeReceiver = mock(NoticeReceiver.class);
        noticeConfigService.sendTestMsg(noticeReceiver);
        verify(dispatcherAlarm, times(1)).sendNoticeMsg(eq(noticeReceiver), any(Alert.class));
    }
}