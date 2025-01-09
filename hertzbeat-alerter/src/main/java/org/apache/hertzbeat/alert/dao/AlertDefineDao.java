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
import java.util.Optional;
import java.util.Set;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/**
 * AlertDefine Dao
 */
public interface AlertDefineDao extends JpaRepository<AlertDefine, Long>, JpaSpecificationExecutor<AlertDefine> {

    /**
     * Delete alarm definitions based on the ID list
     * @param alertDefineIds alarm define ids
     */
    void deleteAlertDefinesByIdIn(Set<Long> alertDefineIds);

    /**
     * Query the alarm define by type
     * @param type alarm type 
     * @return alarm defines
     */
    List<AlertDefine> findAlertDefinesByTypeAndEnableTrue(String type);

    /**
     * Query the alarm define by name
     * @param name alarm name
     * @return alarm define
     */
    Optional<AlertDefine> findAlertDefineByName(String name);
}
