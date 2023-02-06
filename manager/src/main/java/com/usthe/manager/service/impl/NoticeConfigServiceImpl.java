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

package com.usthe.manager.service.impl;

import com.usthe.common.entity.alerter.Alert;
import com.usthe.common.entity.manager.NoticePeriod;
import com.usthe.common.util.CommonConstants;
import com.usthe.manager.cache.CacheFactory;
import com.usthe.manager.cache.ICacheService;
import com.usthe.manager.component.alerter.DispatcherAlarm;
import com.usthe.manager.dao.NoticeReceiverDao;
import com.usthe.manager.dao.NoticeRuleDao;
import com.usthe.common.entity.manager.NoticeReceiver;
import com.usthe.common.entity.manager.NoticeRule;
import com.usthe.manager.dao.NoticePeriodDao;
import com.usthe.manager.service.NoticeConfigService;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 消息通知配置实现
 *
 * @author tom
 * @date 2021/12/16 16:16
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
    private NoticePeriodDao noticePeriodDao;

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
    public NoticeRule getNoticeRuleByReceiverId(Long receiveId) {
        List<NoticeRule> noticeRules = noticeRuleDao.findNoticeRulesByReceiverId(receiveId);
        return noticeRules.isEmpty() ? null : noticeRules.get(0);
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
    }

    @Override
    public void editNoticeRule(NoticeRule noticeRule) {
        noticeRuleDao.save(noticeRule);
        this.clearNoticePeriodCache(noticeRule);
    }

    @Override
    public void deleteNoticeRule(Long ruleId) {
        NoticeRule noticeRule = noticeRuleDao.getReferenceById(ruleId);
        noticeRuleDao.deleteById(ruleId);
        this.clearNoticePeriodCache(noticeRule);
    }

    @Override
    public List<NoticeReceiver> getReceiverFilterRule(Alert alert) {
        // todo use cache   使用缓存
        List<NoticeRule> rules = noticeRuleDao.findNoticeRulesByEnableTrue();

        // The temporary rule is to forward all, and then implement more matching rules: alarm status selection, monitoring type selection, etc.
        // 规则是全部转发, 告警状态选择, 监控类型选择等(按照tags标签和告警级别过滤匹配)
        Set<Long> filterReceivers = rules.stream()
                .filter(rule -> {
                    if (rule.isFilterAll()) {
                        return true;
                    }
                    // filter priorities
                    if (rule.getPriorities() != null && !rule.getPriorities().isEmpty()) {
                        boolean priorityMatch = rule.getPriorities().stream().anyMatch(item -> item != null && item == alert.getPriority());
                        if (!priorityMatch) {
                            return false;
                        }
                    }
                    // filter tags
                    if (rule.getTags() != null && !rule.getTags().isEmpty()) {
                        return rule.getTags().stream().anyMatch(tagItem -> {
                            if (!alert.getTags().containsKey(tagItem.getName())) {
                                return false;
                            }
                            String alertTagValue = alert.getTags().get(tagItem.getName());
                            return Objects.equals(tagItem.getValue(), alertTagValue);
                        });
                    }
                    return true;
                })
                .map(NoticeRule::getReceiverId)
                .collect(Collectors.toSet());
        return noticeReceiverDao.findAllById(filterReceivers);
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
        alert.setTimes(1);
        alert.setFirstTriggerTime(System.currentTimeMillis());
        alert.setLastTriggerTime(System.currentTimeMillis());
        alert.setPriority(CommonConstants.ALERT_PRIORITY_CODE_CRITICAL);
        return dispatcherAlarm.sendNoticeMsg(noticeReceiver, alert);
    }

    @Override
    public NoticePeriod getNoticePeriodById(Long noticePeriodId) {
        return noticePeriodDao.getReferenceById(noticePeriodId);
    }

    @Override
    public List<NoticePeriod> getNoticePeriods() {
        return noticePeriodDao.findAll();
    }

    @Override
    public void addNoticePeriod(NoticePeriod noticePeriod) {
        noticePeriodDao.save(noticePeriod);
    }

    @Override
    public void validateNoticePeriod(NoticePeriod noticePeriod) throws IllegalArgumentException{
        // 验证结束时间大于等于开始时间
        if (noticePeriod.getStartTime().isAfter(noticePeriod.getEndTime())) {
            throw new IllegalArgumentException("notice setting start time is after end time");
        }
        if (noticePeriod.getType() == CommonConstants.NOTICE_PERIOD_DAILY) {
            if (StringUtils.isEmpty(noticePeriod.getPeriodStart()) || StringUtils.isEmpty(noticePeriod.getPeriodEnd())) {
                throw new IllegalArgumentException("notice setting period start or end field is null");
            }
            // 验证periodStart和periodEnd字段是否为时间格式
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm:ss");
            try {
                formatter.parse(noticePeriod.getPeriodStart());
                formatter.parse(noticePeriod.getPeriodEnd());
            } catch (Exception e) {
                throw new IllegalArgumentException("notice setting period start or end field format is not a time type");
            }
        }
    }

    @Override
    public void editNoticePeriod(NoticePeriod noticePeriod) {
        noticePeriodDao.save(noticePeriod);
        this.clearNoticePeriodCache(noticePeriod.getId());
    }

    @Override
    public void deleteNoticePeriod(Long noticePeriodId) {
        noticePeriodDao.deleteById(noticePeriodId);
        // 需要清空notice receiver所有关联该id
        noticeRuleDao.clearNoticePeriod(noticePeriodId);
        // 删除缓存
        this.clearNoticePeriodCache(noticePeriodId);
    }

    private void clearNoticePeriodCache(Long noticePeriodId) {
        List<NoticeRule> noticeRules = noticeRuleDao.findNoticeRulesByPeriodId(noticePeriodId);
        noticeRules.forEach(this::clearNoticePeriodCache);
    }

    private void clearNoticePeriodCache(NoticeRule noticeRule) {
        ICacheService cache = CacheFactory.getCache();
        String key = CommonConstants.RECEIVER_NOTICE_PERIOD_CACHE_PREFIX + noticeRule.getReceiverId();
        cache.remove(key);
    }
}
