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
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * ParamDao database operations
 */
public interface ParamDao extends JpaRepository<Param, Long> {

    /** Find only candidate hosts already monitored as websites, without exposing other parameters. */
    @org.springframework.data.jpa.repository.Query("select distinct lower(p.paramValue) from Param p where p.field = 'host' "
            + "and lower(p.paramValue) in :hosts and p.monitorId in (select m.id from Monitor m where m.app = 'website')")
    List<String> findExistingWebsiteHosts(@org.springframework.data.repository.query.Param("hosts") java.util.Collection<String> hosts);

    /** Host-only projection constrained to the monitor IDs returned by the native read service. */
    @org.springframework.data.jpa.repository.Query("select p.monitorId, p.paramValue from Param p where p.field = 'host' "
            + "and p.monitorId in :ids and p.monitorId in (select m.id from Monitor m where m.app = 'website')")
    List<Object[]> findWebsiteHostProjection(@org.springframework.data.repository.query.Param("ids") java.util.Collection<Long> ids);

    /**
     * Query the list of parameters associated with the monitoring ID'
     * @param monitorId Monitor ID
     * @return list of parameter values
     */
    List<Param> findParamsByMonitorId(Long monitorId);

    /**
     * Remove the parameter list associated with the monitoring ID based on it
     * @param monitorId Monitor Id
     */
    void deleteParamsByMonitorId(long monitorId);

    /**
     * Remove the parameter list associated with the monitoring ID list based on it
     * @param monitorIds Monitoring ID List
     */
    void deleteParamsByMonitorIdIn(Set<Long> monitorIds);
}
