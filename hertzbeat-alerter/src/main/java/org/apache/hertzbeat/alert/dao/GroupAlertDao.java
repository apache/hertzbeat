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

package org.apache.hertzbeat.alert.dao;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.alert.dto.AlertGroupStatusEvidence;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Group Alert Database Operations
 */
public interface GroupAlertDao extends JpaRepository<GroupAlert, Long>, JpaSpecificationExecutor<GroupAlert> {
    
    /**
     * Query alert group by groupKey
     * @param groupKey group key identifier
     * @return alert group
     */
    GroupAlert findByWorkspaceIdAndGroupKey(String workspaceId, String groupKey);

    Optional<GroupAlert> findByWorkspaceIdAndId(String workspaceId, Long id);

    /**
     * Delete alerts based on ID list
     * @param ids Alert ID List
     */
    @Modifying
    void deleteGroupAlertsByWorkspaceIdAndIdIn(String workspaceId, HashSet<Long> ids);

    /**
     * Updates the alarm status based on the alarm ID-status value
     * @param status status value
     * @param ids  alarm ids
     */
    @Modifying
    @Query("update GroupAlert set status = :status where workspaceId = :workspaceId and id in :ids")
    int updateGroupAlertsStatus(@Param("workspaceId") String workspaceId,
                                @Param("status") String status,
                                @Param("ids") List<Long> ids);

    /**
     * find group alerts by id list
     * @param ids ids
     * @return group alerts
     */
    List<GroupAlert> findGroupAlertsByWorkspaceIdAndIdIn(String workspaceId, HashSet<Long> ids);

    List<GroupAlert> findGroupAlertsByWorkspaceIdAndIdIn(String workspaceId, List<Long> ids);

    /**
     * Find only persisted status evidence for the requested group IDs.
     * @param ids requested group IDs
     * @return minimal ID/status projections
     */
    @Query("select new org.apache.hertzbeat.alert.dto.AlertGroupStatusEvidence(alert.id, alert.status) "
            + "from GroupAlert alert where alert.workspaceId = :workspaceId and alert.id in :ids")
    List<AlertGroupStatusEvidence> findStatusEvidenceByWorkspaceIdAndIdIn(
            @Param("workspaceId") String workspaceId, @Param("ids") List<Long> ids);
}
