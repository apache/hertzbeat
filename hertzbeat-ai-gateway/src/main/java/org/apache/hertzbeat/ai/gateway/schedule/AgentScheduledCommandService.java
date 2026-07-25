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

package org.apache.hertzbeat.ai.gateway.schedule;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Manages recurring Gateway commands.
 */
@Service
public class AgentScheduledCommandService {

    private final AgentScheduledCommandDao commandDao;

    public AgentScheduledCommandService(AgentScheduledCommandDao commandDao) {
        this.commandDao = commandDao;
    }

    @Transactional
    public AgentScheduledCommand create(AgentScheduledCommand command) {
        command.setNextRunTime(command.isEnabled() ? next(command.getCronExpression()) : null);
        return commandDao.save(command);
    }

    public List<AgentScheduledCommand> findSessionCommands(Long sessionId) {
        return commandDao.findBySessionIdOrderByIdAsc(sessionId);
    }

    public List<AgentScheduledCommand> findDueCommands() {
        return commandDao.findByEnabledTrueAndNextRunTimeLessThanEqual(LocalDateTime.now());
    }

    public AgentScheduledCommand getOwned(Long commandId, Long sessionId) {
        return commandDao.findById(commandId)
                .filter(command -> sessionId.equals(command.getSessionId()))
                .orElseThrow(() -> new IllegalArgumentException("Scheduled command not found in the current Agent session"));
    }

    @Transactional
    public void delete(Long commandId, Long sessionId) {
        commandDao.delete(getOwned(commandId, sessionId));
    }

    @Transactional
    public AgentScheduledCommand toggle(Long commandId, Long sessionId, boolean enabled) {
        AgentScheduledCommand command = getOwned(commandId, sessionId);
        command.setEnabled(enabled);
        command.setNextRunTime(enabled ? next(command.getCronExpression()) : null);
        return commandDao.save(command);
    }

    @Transactional
    public void completeExecution(AgentScheduledCommand command) {
        command.setLastRunTime(LocalDateTime.now());
        command.setNextRunTime(command.isEnabled() ? next(command.getCronExpression()) : null);
        commandDao.save(command);
    }

    private LocalDateTime next(String expression) {
        return CronExpression.parse(expression).next(LocalDateTime.now());
    }
}
