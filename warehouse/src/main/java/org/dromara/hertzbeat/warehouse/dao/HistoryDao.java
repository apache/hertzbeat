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

package org.dromara.hertzbeat.warehouse.dao;


import org.dromara.hertzbeat.common.entity.warehouse.History;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

/**
 * history entity dao
 * @author tom
 * @date 2023/2/3 15:01
 */
public interface HistoryDao extends JpaRepository<History, Long>, JpaSpecificationExecutor<History> {

    /**
     * delete history before expireTime
     * @param expireTime expireTime
     * @return rows deleted
     */
    @Modifying
    @Transactional(rollbackFor = Exception.class)
    int deleteHistoriesByTimeBefore(Long expireTime);

    /**
     * delete older history record
     * @return rows deleted
     */
    @Modifying
    @Transactional(rollbackFor = Exception.class)
    @Query(value = "delete from hzb_history limit 20000", nativeQuery = true)
    int deleteOlderHistoriesRecord();

    /**
     * truncateTable
     */
    @Modifying
    @Transactional(rollbackFor = Exception.class)
    @Query(value = "TRUNCATE TABLE hzb_history", nativeQuery = true)
    void truncateTable();
}
