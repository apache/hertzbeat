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

package org.apache.hertzbeat.warehouse.dao;

import org.apache.hertzbeat.common.entity.warehouse.History;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * history entity dao
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
     * @param delNum number to be deleted
     * @return rows deleted
     */
    @Modifying
    @Transactional(rollbackFor = Exception.class)
    @Query(value = "DELETE FROM hzb_history WHERE id IN ( SELECT t2.id from (SELECT t1.id FROM hzb_history t1 LIMIT ?1) as t2)", nativeQuery = true)
    int deleteOlderHistoriesRecord(@Param(value = "delNum") int delNum);

    /**
     * truncateTable
     */
    @Modifying
    @Transactional(rollbackFor = Exception.class)
    @Query(value = "TRUNCATE TABLE hzb_history", nativeQuery = true)
    void truncateTable();
}
