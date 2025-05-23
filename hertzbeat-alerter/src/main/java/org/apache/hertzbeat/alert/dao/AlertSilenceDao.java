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
import org.apache.hertzbeat.common.entity.alerter.AlertSilence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;

/**
 * AlertSilence Dao
 */
public interface AlertSilenceDao extends JpaRepository<AlertSilence, Long>, JpaSpecificationExecutor<AlertSilence> {

    /**
     * Delete alarm silence based on the ID list
     *
     * @param silenceIds alert silence id list
     */
    @Modifying
    void deleteAlertSilencesByIdIn(Set<Long> silenceIds);

    /**
     * find enabled alert silence
     * @return enabled alert silence list
     */
    List<AlertSilence> findAlertSilencesByEnableTrue();
}
