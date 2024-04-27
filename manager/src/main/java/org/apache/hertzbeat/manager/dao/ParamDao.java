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
