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
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Single Alert Database Operations
 */
public interface SingleAlertDao extends JpaRepository<SingleAlert, Long>, JpaSpecificationExecutor<SingleAlert> {
    
    /**
     * Query alert by fingerprint
     * @param fingerprint alert fingerprint
     * @return alert
     */
    SingleAlert findByFingerprint(String fingerprint);

    /**
     * Query alerts by fingerprint list
     * @param fingerprints alert fingerprint list
     * @return alerts
     */
    List<SingleAlert> findSingleAlertsByFingerprintIn(List<String> fingerprints);
    
    /**
     * Query alerts by status 
     * @param status status firing or resolved
     * @return alerts
     */
    List<SingleAlert> querySingleAlertsByStatus(String status);

    /**
     * Delete alerts based on ID list
     * @param ids Alert ID List
     */
    @Modifying
    void deleteSingleAlertsByIdIn(HashSet<Long> ids);

    /**
     * Updates the alarm status based on the alarm ID-status value
     * @param status status value
     * @param ids   alarm ids
     */
    @Modifying
    @Query("update SingleAlert set status = :status where id in :ids")
    void updateSingleAlertsStatus(@Param(value = "status") String status, @Param(value = "ids") List<Long> ids);

    /**
     * delete alerts by fingerprint list
     * @param firingAlerts fingerprint list
     */
    @Modifying
    void deleteSingleAlertsByFingerprintIn(List<String> firingAlerts);
}
