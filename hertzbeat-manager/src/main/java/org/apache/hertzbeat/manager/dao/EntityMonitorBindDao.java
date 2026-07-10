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

import java.util.Collection;
import java.util.List;
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * EntityMonitorBind database operation.
 */
public interface EntityMonitorBindDao extends JpaRepository<EntityMonitorBind, Long>, JpaSpecificationExecutor<EntityMonitorBind> {

    List<EntityMonitorBind> findAllByEntityIdOrderByIdAsc(Long entityId);

    List<EntityMonitorBind> findAllByEntityIdInOrderByEntityIdAscIdAsc(Collection<Long> entityIds);

    List<EntityMonitorBind> findAllByMonitorId(Long monitorId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM EntityMonitorBind bind WHERE bind.entityId = :entityId")
    void deleteAllByEntityId(@Param("entityId") Long entityId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM EntityMonitorBind bind WHERE bind.monitorId = :monitorId AND bind.bindType = :bindType")
    void deleteAllByMonitorIdAndBindType(@Param("monitorId") Long monitorId, @Param("bindType") String bindType);

    void deleteAllByMonitorIdIn(Set<Long> monitorIds);

    long countByEntityId(Long entityId);

    @Query("SELECT bind.entityId, COUNT(bind) FROM EntityMonitorBind bind WHERE bind.entityId IN :entityIds GROUP BY bind.entityId")
    List<Object[]> countByEntityIdInGroupByEntityId(@Param("entityIds") Collection<Long> entityIds);
}
