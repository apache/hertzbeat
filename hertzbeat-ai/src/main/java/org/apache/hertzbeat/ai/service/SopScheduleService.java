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

package org.apache.hertzbeat.ai.service;

import java.util.List;
import org.apache.hertzbeat.common.entity.ai.SopSchedule;

/**
 * Service interface for managing scheduled SOP executions.
 */
public interface SopScheduleService {

    /**
     * Create a new scheduled SOP task.
     * @param schedule The schedule configuration
     * @return The created schedule with generated ID
     */
    SopSchedule createSchedule(SopSchedule schedule);

    /**
     * Update an existing schedule.
     * @param schedule The updated schedule
     * @return The updated schedule
     */
    SopSchedule updateSchedule(SopSchedule schedule);

    /**
     * Delete a schedule by ID.
     * @param id The schedule ID
     */
    void deleteSchedule(Long id);

    /**
     * Get a schedule by ID.
     * @param id The schedule ID
     * @return The schedule or null if not found
     */
    SopSchedule getSchedule(Long id);

    /**
     * Get all schedules for a conversation.
     * @param conversationId The conversation ID
     * @return List of schedules
     */
    List<SopSchedule> getSchedulesByConversation(Long conversationId);

    /**
     * Toggle the enabled status of a schedule.
     * @param id The schedule ID
     * @param enabled The new enabled status
     * @return The updated schedule
     */
    SopSchedule toggleSchedule(Long id, boolean enabled);

    /**
     * Get all schedules that are due for execution.
     * @return List of due schedules
     */
    List<SopSchedule> getDueSchedules();

    /**
     * Update the execution times after a schedule runs.
     * @param id The schedule ID
     */
    void updateAfterExecution(Long id);
}
