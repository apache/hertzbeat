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
import java.util.Set;
import org.apache.hertzbeat.common.entity.alerter.AlertDefineMonitorBind;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/**
 * AlertDefineBind database operations
 */
public interface AlertDefineBindDao extends JpaRepository<AlertDefineMonitorBind, Long>, JpaSpecificationExecutor<AlertDefineMonitorBind> {

    /**
     * Delete the alarm definition and monitor association based on the alarm definition ID
     * @param alertDefineId Alarm Definition ID  
     */
    void deleteAlertDefineBindsByAlertDefineIdEquals(Long alertDefineId);

    /**
     * Deleting alarms based on monitoring IDs defines monitoring associations
     * @param monitorId Monitor Id 
     */
    void deleteAlertDefineMonitorBindsByMonitorIdEquals(Long monitorId);

    /**
     * Delete alarm definition monitoring association based on monitoring ID list
     * @param monitorIds Monitoring ID List  
     */
    void deleteAlertDefineMonitorBindsByMonitorIdIn(Set<Long> monitorIds);

    /**
     * Query monitoring related information based on alarm definition ID
     * @param alertDefineId Alarm Definition ID     
     * @return Associated monitoring information    
     */
    List<AlertDefineMonitorBind> getAlertDefineBindsByAlertDefineIdEquals(Long alertDefineId);
}
