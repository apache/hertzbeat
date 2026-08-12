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

package org.apache.hertzbeat.manager.dao;

import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.MonitorMetricLayoutEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Monitor metric layout repository.
 */
public interface MonitorMetricLayoutDao extends JpaRepository<MonitorMetricLayoutEntity, Long> {

    Optional<MonitorMetricLayoutEntity> findByCreatorAndApplication(String creator, String application);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update MonitorMetricLayoutEntity layout set layout.layoutDocument = :document, "
            + "layout.schemaVersion = :schemaVersion, layout.revision = :revision, "
            + "layout.updateTime = CURRENT_TIMESTAMP where layout.creator = :creator "
            + "and layout.application = :application and layout.revision = :expectedRevision")
    int updateLayoutIfRevision(
            @Param("creator") String creator,
            @Param("application") String application,
            @Param("document") String document,
            @Param("schemaVersion") Integer schemaVersion,
            @Param("revision") String revision,
            @Param("expectedRevision") String expectedRevision);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from MonitorMetricLayoutEntity layout where layout.creator = :creator "
            + "and layout.application = :application and layout.revision = :revision")
    int deleteByCreatorAndApplicationAndRevision(
            @Param("creator") String creator,
            @Param("application") String application,
            @Param("revision") String revision);
}
