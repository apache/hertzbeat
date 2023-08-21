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

package org.dromara.hertzbeat.manager.service.impl;

import org.dromara.hertzbeat.common.cache.CacheFactory;
import org.dromara.hertzbeat.common.cache.ICacheService;
import org.dromara.hertzbeat.common.entity.alerter.Alert;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.manager.component.alerter.DispatcherAlarm;
import org.dromara.hertzbeat.manager.dao.NoticeReceiverDao;
import org.dromara.hertzbeat.manager.dao.NoticeRuleDao;
import org.dromara.hertzbeat.common.entity.manager.NoticeReceiver;
import org.dromara.hertzbeat.common.entity.manager.NoticeRule;
import org.dromara.hertzbeat.manager.service.NoticeConfigService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 消息通知配置实现
 *
 * @author tom
 *
 */
@Service
@Transactional(rollbackFor = Exception.class)
@Slf4j
public class NoticeConfigServiceImpl implements NoticeConfigService {

    private static final String ALERT_TEST_TARGET = "Test Target";

    private static final String ALERT_TEST_CONTENT = "test send msg! \n This is the test data. It is proved that it can be received successfully";

    @Autowired
    private NoticeReceiverDao noticeReceiverDao;

    @Autowired
    private NoticeRuleDao noticeRuleDao;

    @Autowired
    @Lazy
    private DispatcherAlarm dispatcherAlarm;

    @Override
    public List<NoticeReceiver> getNoticeReceivers(Specification<NoticeReceiver> specification) {
        return noticeReceiverDao.findAll(specification);
    }

    @Override
    public List<NoticeRule> getNoticeRules(Specification<NoticeRule> specification) {
        return noticeRuleDao.findAll(specification);
    }

    @Override
    public void addReceiver(NoticeReceiver noticeReceiver) {
        noticeReceiverDao.save(noticeReceiver);
    }

    @Override
    public void editReceiver(NoticeReceiver noticeReceiver) {
        noticeReceiverDao.save(noticeReceiver);
    }

    @Override
    public void deleteReceiver(Long receiverId) {
        noticeReceiverDao.deleteById(receiverId);
    }

    @Override
    public void addNoticeRule(NoticeRule noticeRule) {
        noticeRuleDao.save(noticeRule);
        clearNoticeRulesCache();
    }

    @Override
    public void editNoticeRule(NoticeRule noticeRule) {
        noticeRuleDao.save(noticeRule);
        clearNoticeRulesCache();
    }

    @Override
    public void deleteNoticeRule(Long ruleId) {
        noticeRuleDao.deleteById(ruleId);
        clearNoticeRulesCache();
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<NoticeReceiver> getReceiverFilterRule(Alert alert) {
        List<NoticeRule> rules = getNoticeRulesFromCacheOrDatabase();
        Set<Long> filterReceivers = rules.stream()
                .filter(rule -> matchesRule(alert, rule))
                .map(NoticeRule::getReceiverId)
                .collect(Collectors.toSet());
        return noticeReceiverDao.findAllById(filterReceivers);
    }

    private List<NoticeRule> getNoticeRulesFromCacheOrDatabase() {
        ICacheService<String, Object> noticeCache = CacheFactory.getNoticeCache();
        List<NoticeRule> rules = (List<NoticeRule>) noticeCache.get(CommonConstants.CACHE_NOTICE_RULE);
        if (rules == null) {
            rules = noticeRuleDao.findNoticeRulesByEnableTrue();
            noticeCache.put(CommonConstants.CACHE_NOTICE_RULE, rules);
        }
        return rules;
    }
    private boolean matchesRule(Alert alert, NoticeRule rule) {
        LocalDateTime nowDate = LocalDateTime.now();
        int currentDayOfWeek = nowDate.toLocalDate().getDayOfWeek().getValue();
        LocalTime nowTime = nowDate.toLocalTime();

        return matchesDay(rule, currentDayOfWeek) &&
                matchesTime(rule, nowTime) &&
                matchesPriority(rule, alert.getPriority()) &&
                matchesTags(rule, alert);
    }
    private boolean matchesDay(NoticeRule rule, int currentDayOfWeek) {
        return rule.getDays() == null || rule.getDays().isEmpty() || rule.getDays().contains(currentDayOfWeek);
    }

    private boolean matchesTime(NoticeRule rule, LocalTime nowTime) {
        if (rule.getPeriodStart() == null || rule.getPeriodEnd() == null) {
            return true;
        }
        LocalTime startTime = rule.getPeriodStart().toLocalTime();
        LocalTime endTime = rule.getPeriodEnd().toLocalTime();
        return nowTime.isAfter(startTime) && nowTime.isBefore(endTime);
    }

    private boolean matchesPriority(NoticeRule rule, int alertPriority) {
        return rule.isFilterAll() || (rule.getPriorities() != null && rule.getPriorities().contains(alertPriority));
    }

    private boolean matchesTags(NoticeRule rule, Alert alert) {
        if (rule.getTags() == null || rule.getTags().isEmpty()) {
            return true;
        }
        return rule.getTags().stream()
                .anyMatch(tagItem -> alert.getTags().containsKey(tagItem.getName()) &&
                        Objects.equals(tagItem.getValue(), alert.getTags().get(tagItem.getName())));
    }

    @Override
    public NoticeReceiver getReceiverById(Long receiverId) {
        return noticeReceiverDao.getReferenceById(receiverId);
    }

    @Override
    public NoticeRule getNoticeRulesById(Long ruleId) {
        return noticeRuleDao.getReferenceById(ruleId);
    }

    @Override
    public boolean sendTestMsg(NoticeReceiver noticeReceiver) {
        Alert alert = new Alert();
        alert.setTarget(ALERT_TEST_TARGET);
        alert.setContent(ALERT_TEST_CONTENT);
        alert.setTriggerTimes(1);
        alert.setFirstAlarmTime(System.currentTimeMillis());
        alert.setLastAlarmTime(System.currentTimeMillis());
        alert.setPriority(CommonConstants.ALERT_PRIORITY_CODE_CRITICAL);
        return dispatcherAlarm.sendNoticeMsg(noticeReceiver, alert);
    }

    private void clearNoticeRulesCache() {
        ICacheService<String, Object> noticeCache = CacheFactory.getNoticeCache();
        noticeCache.remove(CommonConstants.CACHE_NOTICE_RULE);
    }
}
