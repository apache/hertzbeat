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

package org.apache.hertzbeat.ai.tools;

/**
 * Interface for AI Schedule management tools.
 * Allows AI to create, list, and manage scheduled tasks via natural language.
 */
public interface ScheduleTools {

    /**
     * Create a scheduled task to execute a skill periodically.
     * @param skillName Name of the skill to schedule (e.g., daily_inspection)
     * @param cronExpression Cron expression for scheduling (6-digit Spring format)
     * @param description Human-readable description of the schedule
     * @return Confirmation message with schedule details
     */
    String createSchedule(String skillName, String cronExpression, String description);

    /**
     * List all scheduled tasks for the current conversation.
     * @return List of scheduled tasks with their status
     */
    String listSchedules();

    /**
     * Delete a scheduled task by ID.
     * @param scheduleId ID of the schedule to delete
     * @return Confirmation message
     */
    String deleteSchedule(Long scheduleId);

    /**
     * Enable or disable a scheduled task.
     * @param scheduleId ID of the schedule
     * @param enabled Whether to enable or disable
     * @return Confirmation message
     */
    String toggleSchedule(Long scheduleId, boolean enabled);
}
