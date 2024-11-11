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

import java.util.List;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Alert Monitor Dao
 */
public interface AlertMonitorDao extends JpaRepository<Monitor, Long>, JpaSpecificationExecutor<Monitor> {
    
    /**
     * Query the monitoring status of a specified monitoring state
     * @param status status value
     * @return Monitor the list
     */
    List<Monitor> findMonitorsByStatus(Byte status);
    
    /**
     * find monitor bind tags by monitorId
     * @param monitorId monitorId
     * @return bind tags
     */
    @Query("select tag from Tag tag join TagMonitorBind bind on bind.tagId = tag.id where bind.monitorId = :monitorId")
    List<Tag> findMonitorIdBindTags(@Param(value = "monitorId") Long monitorId);
}
