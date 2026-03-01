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

package org.apache.hertzbeat.ai.dao;

import java.time.LocalDateTime;
import java.util.List;
import org.apache.hertzbeat.common.entity.ai.SopSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Repository for SopSchedule entity operations.
 */
@Repository
public interface SopScheduleDao extends JpaRepository<SopSchedule, Long>, JpaSpecificationExecutor<SopSchedule> {

    /**
     * Find all schedules for a specific conversation.
     * @param conversationId The conversation ID
     * @return List of schedules
     */
    List<SopSchedule> findByConversationId(Long conversationId);

    /**
     * Find all enabled schedules that are due for execution.
     * @param currentTime The current time to compare against
     * @return List of due schedules
     */
    @Query("SELECT s FROM SopSchedule s WHERE s.enabled = true AND s.nextRunTime <= :currentTime")
    List<SopSchedule> findDueSchedules(@Param("currentTime") LocalDateTime currentTime);

    /**
     * Find all enabled schedules.
     * @return List of enabled schedules
     */
    List<SopSchedule> findByEnabledTrue();

    /**
     * Delete all schedules for a conversation.
     * @param conversationId The conversation ID
     */
    void deleteByConversationId(Long conversationId);
}
