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

package org.apache.hertzbeat.alert.service.impl;

import jakarta.persistence.criteria.Predicate;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.cache.CacheFactory;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.NoticeReceiver;
import org.apache.hertzbeat.common.entity.alerter.NoticeRule;
import org.apache.hertzbeat.common.entity.alerter.NoticeTemplate;
import org.apache.hertzbeat.alert.notice.AlertNoticeDispatch;
import org.apache.hertzbeat.alert.dao.NoticeReceiverDao;
import org.apache.hertzbeat.alert.dao.NoticeRuleDao;
import org.apache.hertzbeat.alert.dao.NoticeTemplateDao;
import org.apache.hertzbeat.alert.service.NoticeConfigService;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Lazy;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Message notification configuration implementation
 */
@Service
@Order(value = Ordered.HIGHEST_PRECEDENCE)
@Transactional(rollbackFor = Exception.class)
@Slf4j
public class NoticeConfigServiceImpl implements NoticeConfigService, CommandLineRunner {
    
    private static final Map<Byte, NoticeTemplate> PRESET_TEMPLATE = new HashMap<>(16);
    
    @Autowired
    private NoticeReceiverDao noticeReceiverDao;

    @Autowired
    private NoticeRuleDao noticeRuleDao;
    
    @Autowired
    private NoticeTemplateDao noticeTemplateDao;
    
    @Autowired
    @Lazy
    private AlertNoticeDispatch dispatcherAlarm;

    @Override
    public Page<NoticeReceiver> getNoticeReceivers(String name, int pageIndex, int pageSize) {
        Specification<NoticeReceiver> specification = (root, query, criteriaBuilder) -> {
            Predicate predicate = criteriaBuilder.conjunction();
            if (StringUtils.isNotBlank(name)) {
                Predicate predicateName = criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("name")), "%" + name.toLowerCase() + "%"
                );
                predicate = criteriaBuilder.and(predicateName);
            }
            return predicate;
        };
        return noticeReceiverDao.findAll(specification, PageRequest.of(pageIndex, pageSize, Sort.by(Sort.Direction.DESC, "id")));
    }

    @Override
    public List<NoticeReceiver> getAllNoticeReceivers() {
        return noticeReceiverDao.findAll();
    }

    @Override
    public Page<NoticeTemplate> getNoticeTemplates(String name, boolean preset, int pageIndex, int pageSize) {
        if (preset) {
            // Query preset templates
            List<NoticeTemplate> defaultTemplates = new LinkedList<>(PRESET_TEMPLATE.values());

            // Filter by name (case-insensitive)
            List<NoticeTemplate> filteredDefaultTemplates = defaultTemplates.stream()
                    .filter(template -> StringUtils.isBlank(name)
                            || template.getName().toLowerCase().contains(name.toLowerCase()))
                    .collect(Collectors.toList());

            // Pagination logic
            int totalItems = filteredDefaultTemplates.size();
            int fromIndex = Math.min(pageIndex * pageSize, totalItems);
            int toIndex = Math.min(fromIndex + pageSize, totalItems);

            if (fromIndex >= totalItems) {
                return new PageImpl<>(Collections.emptyList(), PageRequest.of(pageIndex, pageSize), totalItems);
            }

            List<NoticeTemplate> paginatedTemplates = filteredDefaultTemplates.subList(fromIndex, toIndex);
            return new PageImpl<>(paginatedTemplates, PageRequest.of(pageIndex, pageSize), totalItems);
        } else {
            // Query custom templates
            Specification<NoticeTemplate> specification = (root, query, criteriaBuilder) -> {
                Predicate predicate = criteriaBuilder.conjunction();
                if (StringUtils.isNotBlank(name)) {
                    Predicate predicateName = criteriaBuilder.like(
                            criteriaBuilder.lower(root.get("name")), "%" + name.toLowerCase() + "%"
                    );
                    predicate = criteriaBuilder.and(predicateName);
                }
                return predicate;
            };
            PageRequest pageRequest = PageRequest.of(pageIndex, pageSize, Sort.by(Sort.Direction.DESC, "id"));
            return noticeTemplateDao.findAll(specification, pageRequest);
        }
    }



    @Override
    public List<NoticeTemplate> getAllNoticeTemplates() {
        List<NoticeTemplate> defaultTemplates = new LinkedList<>(PRESET_TEMPLATE.values());
        defaultTemplates.addAll(noticeTemplateDao.findAll());
        return defaultTemplates;
    }

    @Override
    public Page<NoticeRule> getNoticeRules(String name, int pageIndex, int pageSize) {
        Specification<NoticeRule> specification = (root, query, criteriaBuilder) -> {
            Predicate predicate = criteriaBuilder.conjunction();
            if (StringUtils.isNotBlank(name)) {
                Predicate predicateName = criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("name")), "%" + name.toLowerCase() + "%"
                );
                predicate = criteriaBuilder.and(predicateName);
            }
            return predicate;
        };
        return noticeRuleDao.findAll(specification, PageRequest.of(pageIndex, pageSize, Sort.by(Sort.Direction.DESC, "id")));
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
    public List<NoticeRule> getReceiverFilterRule(GroupAlert alert) {
        // use cache
        List<NoticeRule> rules = CacheFactory.getNoticeCache();
        if (rules == null) {
            rules = noticeRuleDao.findNoticeRulesByEnableTrue();
            CacheFactory.setNoticeCache(rules);
        }

        // The temporary rule is to forward all, and then implement more matching rules: alarm status selection, monitoring type selection, etc.
        return rules.stream()
                .filter(rule -> {
                    if (!rule.isFilterAll()) {
                        // filter labels
                        if (rule.getLabels() != null && !rule.getLabels().isEmpty()) {
                            boolean labelMatch = rule.getLabels().entrySet().stream().allMatch(labelItem -> {
                                if (!alert.getCommonLabels().containsKey(labelItem.getKey())) {
                                    return false;
                                }
                                String alertLabelValue = alert.getCommonLabels().get(labelItem.getKey());
                                return Objects.equals(labelItem.getValue(), alertLabelValue);
                            });
                            if (!labelMatch) {
                                return false;
                            }
                        }
                    }
                    
                    LocalDateTime nowDate = LocalDateTime.now();
                    // filter day
                    int currentDayOfWeek = nowDate.toLocalDate().getDayOfWeek().getValue();
                    if (rule.getDays() != null && !rule.getDays().isEmpty()) {
                        boolean dayMatch = rule.getDays().stream().anyMatch(item -> item == currentDayOfWeek);
                        if (!dayMatch) {
                            return false;
                        }
                    }
                    // filter time
                    LocalTime nowTime = nowDate.toLocalTime();
                    boolean startMatch = rule.getPeriodStart() == null
                            || nowTime.isAfter(rule.getPeriodStart().toLocalTime())
                            || (rule.getPeriodEnd() != null && rule.getPeriodStart().isAfter(rule.getPeriodEnd())
                                    && nowTime.isBefore(rule.getPeriodStart().toLocalTime()));
                    boolean endMatch = rule.getPeriodEnd() == null
                            || nowTime.isBefore(rule.getPeriodEnd().toLocalTime());
                    return startMatch && endMatch;
                })
                .collect(Collectors.toList());
    }

    @Override
    public NoticeTemplate getOneTemplateById(Long id) {
        return noticeTemplateDao.findById(id).orElse(null);
    }


    @Override
    public NoticeReceiver getReceiverById(Long receiverId) {
        return noticeReceiverDao.findById(receiverId).orElse(null);
    }

    @Override
    public NoticeRule getNoticeRulesById(Long ruleId) {
        return noticeRuleDao.findById(ruleId).orElse(null);
    }


    @Override
    public void addNoticeTemplate(NoticeTemplate noticeTemplate) {
        noticeTemplateDao.save(noticeTemplate);
        clearNoticeRulesCache();
    }

    @Override
    public void editNoticeTemplate(NoticeTemplate noticeTemplate) {
        noticeTemplateDao.save(noticeTemplate);
        clearNoticeRulesCache();
    }

    @Override
    public void deleteNoticeTemplate(Long templateId) {
        noticeTemplateDao.deleteById(templateId);
        clearNoticeRulesCache();
    }

    @Override
    public Optional<NoticeTemplate> getNoticeTemplatesById(Long templateId) {
        return noticeTemplateDao.findById(templateId);
    }

    @Override
    public NoticeTemplate getDefaultNoticeTemplateByType(Byte type) {
        if (type == null) {
            return null;
        }
        return PRESET_TEMPLATE.get(type);
    }

    @Override
    public boolean sendTestMsg(NoticeReceiver noticeReceiver) {
        Map<String, String> labels = new HashMap<>(8);
        labels.put(CommonConstants.LABEL_INSTANCE, "1000000");
        labels.put(CommonConstants.LABEL_ALERT_NAME, "CPU Usage Alert");
        labels.put(CommonConstants.LABEL_INSTANCE_HOST, "127.0.0.1");
        Map<String, String> annotations = new HashMap<>(8);
        annotations.put("suggest", "Please check the CPU usage of the server");
        SingleAlert singleAlert1 = SingleAlert.builder()
                .labels(labels)
                .content("test send msg! \\n This is the test data. It is proved that it can be received successfully")
                .startAt(System.currentTimeMillis())
                .activeAt(System.currentTimeMillis())
                .endAt(System.currentTimeMillis())
                .triggerTimes(2)
                .annotations(annotations)
                .status("firing")
                .build();
        SingleAlert singleAlert2 = SingleAlert.builder()
                .labels(labels)
                .content("test send msg! \\n This is the test data. It is proved that it can be received successfully")
                .startAt(System.currentTimeMillis())
                .activeAt(System.currentTimeMillis())
                .endAt(System.currentTimeMillis())
                .triggerTimes(4)
                .annotations(annotations)
                .status("firing")
                .build();
        GroupAlert groupAlert = GroupAlert.builder()
                .commonLabels(Map.of(CommonConstants.LABEL_ALERT_NAME, "CPU Usage Alert"))
                .commonAnnotations(annotations)
                .alerts(List.of(singleAlert1, singleAlert2))
                .status("firing")
                .build();
        return dispatcherAlarm.sendNoticeMsg(noticeReceiver, null, groupAlert);
    }

    private void clearNoticeRulesCache() {
        CacheFactory.clearNoticeCache();
    }

    @Override
    public void run(String... args) throws Exception {
        try {
            log.info("load default notice template in internal jar");
            PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
            Resource[] resources = resolver.getResources("classpath:templates/*.*");
            for (Resource resource : resources) {
                if (resource.getFilename() == null || (!resource.getFilename().endsWith("txt") && !resource.getFilename().endsWith("html"))) {
                    log.warn("Ignore the template file {}.", resource.getFilename());
                    continue;
                }
                try (InputStream inputStream = resource.getInputStream()) {
                    byte[] bytes = new byte[inputStream.available()];
                    inputStream.read(bytes);
                    String content = new String(bytes, StandardCharsets.UTF_8);
                    NoticeTemplate template = new NoticeTemplate();
                    String name = resource.getFilename().replace(".txt", "").replace(".html", "");
                    String[] names = name.split("-");
                    if (names.length != 2) {
                        log.warn("Ignore the template file {}.", resource.getFilename());
                        continue;
                    }
                    byte type = Byte.parseByte(names[0]);
                    name = names[1];
                    template.setName(name);
                    template.setType(type);
                    template.setPreset(true);
                    template.setContent(content);
                    template.setGmtUpdate(LocalDateTime.now());
                    PRESET_TEMPLATE.put(template.getType(), template);
                } catch (IOException e) {
                    log.error(e.getMessage(), e);
                    log.error("Ignore this template file: {}.", resource.getFilename());
                }
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }
}
