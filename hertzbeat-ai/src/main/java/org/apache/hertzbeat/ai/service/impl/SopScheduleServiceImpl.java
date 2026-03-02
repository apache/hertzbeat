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

import java.time.LocalDateTime;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.dao.SopScheduleDao;
import org.apache.hertzbeat.ai.service.SopScheduleService;
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

    @Autowired
    public SopScheduleServiceImpl(SopScheduleDao sopScheduleDao) {
        this.sopScheduleDao = sopScheduleDao;
    }

    @Override
    @Transactional
    public SopSchedule createSchedule(SopSchedule schedule) {
        // Validate cron expression
        validateCronExpression(schedule.getCronExpression());
        
        // Calculate next run time
        schedule.setNextRunTime(calculateNextRunTime(schedule.getCronExpression()));
        schedule.setEnabled(schedule.getEnabled() != null ? schedule.getEnabled() : true);
        
        SopSchedule saved = sopScheduleDao.save(schedule);
        log.info("Created schedule {} for conversation {} with SOP {}", 
                saved.getId(), saved.getConversationId(), saved.getSopName());
        return saved;
    }

    @Override
    @Transactional
    public SopSchedule updateSchedule(SopSchedule schedule) {
        SopSchedule existing = sopScheduleDao.findById(schedule.getId())
                .orElseThrow(() -> new IllegalArgumentException("Schedule not found: " + schedule.getId()));
        
        // Update fields
        existing.setSopName(schedule.getSopName());
        existing.setSopParams(schedule.getSopParams());
        
        // If cron expression changed, recalculate next run time
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
        log.info("Deleting schedule {}", id);
        sopScheduleDao.deleteById(id);
    }

    @Override
    public SopSchedule getSchedule(Long id) {
        return sopScheduleDao.findById(id).orElse(null);
    }

    @Override
    public List<SopSchedule> getSchedulesByConversation(Long conversationId) {
        return sopScheduleDao.findByConversationId(conversationId);
    }

    @Override
    @Transactional
    public SopSchedule toggleSchedule(Long id, boolean enabled) {
        SopSchedule schedule = sopScheduleDao.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Schedule not found: " + id));
        
        schedule.setEnabled(enabled);
        
        // If enabling, recalculate next run time
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
    public void updateAfterExecution(Long id) {
        SopSchedule schedule = sopScheduleDao.findById(id).orElse(null);
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
}
