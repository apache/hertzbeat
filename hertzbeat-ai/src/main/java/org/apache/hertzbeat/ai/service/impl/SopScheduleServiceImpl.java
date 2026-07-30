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

package org.apache.hertzbeat.ai.service.impl;

import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import java.time.LocalDateTime;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.ai.dao.ChatConversationDao;
import org.apache.hertzbeat.ai.dao.SopScheduleDao;
import org.apache.hertzbeat.ai.service.SopScheduleService;
import org.apache.hertzbeat.common.entity.ai.ChatConversation;
import org.apache.hertzbeat.common.entity.ai.SopSchedule;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Implementation of SopScheduleService for managing scheduled SOP executions.
 */
@Slf4j
@Service
public class SopScheduleServiceImpl implements SopScheduleService {

    private final SopScheduleDao sopScheduleDao;
    private final ChatConversationDao conversationDao;

    @Autowired
    public SopScheduleServiceImpl(SopScheduleDao sopScheduleDao,
                                  ChatConversationDao conversationDao) {
        this.sopScheduleDao = sopScheduleDao;
        this.conversationDao = conversationDao;
    }

    @Override
    @Transactional
    public SopSchedule createSchedule(SopSchedule schedule) {
        String creator = requireCurrentUserId();
        requireOwnedConversation(schedule.getConversationId(), creator);
        validateCronExpression(schedule.getCronExpression());

        SopSchedule persisted = SopSchedule.builder()
                .conversationId(schedule.getConversationId())
                .sopName(schedule.getSopName())
                .sopParams(schedule.getSopParams())
                .cronExpression(schedule.getCronExpression())
                .enabled(schedule.getEnabled() != null ? schedule.getEnabled() : true)
                .nextRunTime(calculateNextRunTime(schedule.getCronExpression()))
                .creator(creator)
                .build();
        SopSchedule saved = sopScheduleDao.save(persisted);
        log.info("Created schedule {} for conversation {} with SOP {}", 
                saved.getId(), saved.getConversationId(), saved.getSopName());
        return saved;
    }

    @Override
    @Transactional
    public SopSchedule updateSchedule(SopSchedule schedule) {
        SopSchedule existing = sopScheduleDao.findByIdAndCreator(
                        schedule.getId(), requireCurrentUserId())
                .orElseThrow(() -> new IllegalArgumentException("Schedule not found: " + schedule.getId()));

        existing.setSopName(schedule.getSopName());
        existing.setSopParams(schedule.getSopParams());

        if (!existing.getCronExpression().equals(schedule.getCronExpression())) {
            validateCronExpression(schedule.getCronExpression());
            existing.setCronExpression(schedule.getCronExpression());
            existing.setNextRunTime(calculateNextRunTime(schedule.getCronExpression()));
        }

        if (schedule.getEnabled() != null) {
            existing.setEnabled(schedule.getEnabled());
        }

        return sopScheduleDao.save(existing);
    }

    @Override
    @Transactional
    public void deleteSchedule(Long id) {
        SopSchedule schedule = sopScheduleDao.findByIdAndCreator(id, requireCurrentUserId())
                .orElseThrow(() -> new IllegalArgumentException("Schedule not found: " + id));
        log.info("Deleting schedule {}", id);
        sopScheduleDao.delete(schedule);
    }

    @Override
    public SopSchedule getSchedule(Long id) {
        return sopScheduleDao.findByIdAndCreator(id, requireCurrentUserId()).orElse(null);
    }

    @Override
    public List<SopSchedule> getSchedulesByConversation(Long conversationId) {
        String creator = requireCurrentUserId();
        requireOwnedConversation(conversationId, creator);
        return sopScheduleDao.findByConversationIdAndCreator(conversationId, creator);
    }

    @Override
    @Transactional
    public SopSchedule toggleSchedule(Long id, boolean enabled) {
        SopSchedule schedule = sopScheduleDao.findByIdAndCreator(id, requireCurrentUserId())
                .orElseThrow(() -> new IllegalArgumentException("Schedule not found: " + id));

        schedule.setEnabled(enabled);

        if (enabled) {
            schedule.setNextRunTime(calculateNextRunTime(schedule.getCronExpression()));
        }

        log.info("Schedule {} {} ", id, enabled ? "enabled" : "disabled");
        return sopScheduleDao.save(schedule);
    }

    @Override
    public List<SopSchedule> getDueSchedules() {
        return sopScheduleDao.findDueSchedules(LocalDateTime.now());
    }

    @Override
    @Transactional
    public SopSchedule getScheduleForExecution(Long id) {
        SopSchedule schedule = sopScheduleDao.findById(id).orElse(null);
        if (schedule == null || !Boolean.TRUE.equals(schedule.getEnabled())) {
            return null;
        }
        if (StringUtils.isBlank(schedule.getCreator())
                || conversationDao.findByIdAndCreator(
                        schedule.getConversationId(), schedule.getCreator()).isEmpty()) {
            schedule.setEnabled(false);
            sopScheduleDao.save(schedule);
            log.warn("Disabled schedule {} because its execution owner is missing", id);
            return null;
        }
        return schedule;
    }

    @Override
    @Transactional
    public void updateAfterExecution(Long id) {
        SopSchedule schedule = getScheduleForExecution(id);
        if (schedule == null) {
            return;
        }

        schedule.setLastRunTime(LocalDateTime.now());
        schedule.setNextRunTime(calculateNextRunTime(schedule.getCronExpression()));
        sopScheduleDao.save(schedule);

        log.debug("Updated schedule {} - Last run: {}, Next run: {}", 
                id, schedule.getLastRunTime(), schedule.getNextRunTime());
    }

    private void validateCronExpression(String cronExpression) {
        try {
            CronExpression.parse(cronExpression);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid cron expression: " + cronExpression, e);
        }
    }

    private LocalDateTime calculateNextRunTime(String cronExpression) {
        try {
            CronExpression cron = CronExpression.parse(cronExpression);
            return cron.next(LocalDateTime.now());
        } catch (Exception e) {
            log.error("Failed to calculate next run time for cron: {}", cronExpression, e);
            return null;
        }
    }

    private String requireCurrentUserId() {
        SubjectSum subject = SurenessContextHolder.getBindSubject();
        if (subject == null || subject.getPrincipal() == null) {
            throw new IllegalStateException("No authenticated user");
        }
        return String.valueOf(subject.getPrincipal());
    }

    private ChatConversation requireOwnedConversation(Long conversationId, String creator) {
        return conversationDao.findByIdAndCreator(conversationId, creator)
                .orElseThrow(() ->
                        new IllegalArgumentException("Conversation not found: " + conversationId));
    }
}
