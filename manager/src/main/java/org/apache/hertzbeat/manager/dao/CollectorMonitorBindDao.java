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

import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.CollectorMonitorBind;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;

/**
 * CollectorMonitorBind repository
 */
public interface CollectorMonitorBindDao extends JpaRepository<CollectorMonitorBind, Long>, JpaSpecificationExecutor<CollectorMonitorBind> {
    
    /**
     * find monitors by collector
     * @param collector collector
     * @return monitor bind
     */
    List<CollectorMonitorBind> findCollectorMonitorBindsByCollector(String collector);

    /**
     * find monitor collector bind by monitor ids
     * @param monitorIds monitor ids
     * @return binds
     */
    List<CollectorMonitorBind> findCollectorMonitorBindsByMonitorIdIn(Set<Long> monitorIds);
    
    /**
     * find bind collector by monitor id
     * @param monitorId monitor id
     * @return collector bind
     */
    Optional<CollectorMonitorBind> findCollectorMonitorBindByMonitorId(Long monitorId);
    
    
    /**
     * delete bind by monitor id
     * @param monitorId monitor id
     */
    @Modifying
    void deleteCollectorMonitorBindsByMonitorId(Long monitorId);
}
