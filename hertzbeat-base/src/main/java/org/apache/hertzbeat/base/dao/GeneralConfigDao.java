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

package org.apache.hertzbeat.base.dao;

import jakarta.persistence.LockModeType;
import org.apache.hertzbeat.common.entity.manager.GeneralConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Component;

/**
 * Public server configuration Dao
 * todo common config data cache
 * <p>This interface inherits the two interfaces JpaRepository and JpaSpecificationExecutor, providing basic CRUD operations and specification query capabilities.</p>
 */
@Component
public interface GeneralConfigDao extends JpaRepository<GeneralConfig, String>, JpaSpecificationExecutor<GeneralConfig> {
    
    /**
     * Query by type
     * @param type type
     * @return Return the queried configuration information
     */
    GeneralConfig findByType(String type);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select config from GeneralConfig config where config.type = :type")
    GeneralConfig findByTypeForUpdate(@Param("type") String type);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update GeneralConfig config
               set config.content = :content,
                   config.revision = :nextRevision,
                   config.gmtUpdate = CURRENT_TIMESTAMP
             where config.type = :type
               and config.revision = :expectedRevision
            """)
    int updateContentIfRevision(@Param("type") String type,
                                @Param("content") String content,
                                @Param("nextRevision") String nextRevision,
                                @Param("expectedRevision") String expectedRevision);
}
