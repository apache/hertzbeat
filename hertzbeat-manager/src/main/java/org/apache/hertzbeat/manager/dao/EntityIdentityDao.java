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
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * EntityIdentity database operation.
 */
public interface EntityIdentityDao extends JpaRepository<EntityIdentity, Long>, JpaSpecificationExecutor<EntityIdentity> {

    List<EntityIdentity> findAllByEntityIdOrderByPriorityDescIdAsc(Long entityId);

    List<EntityIdentity> findAllByIdentityKeyInAndNormalizedValueIn(Set<String> identityKeys, Set<String> normalizedValues);

    List<EntityIdentity> findAllByIdentityKeyInOrderByIdDesc(Set<String> identityKeys, Pageable pageable);

    @Query("SELECT COUNT(DISTINCT identity.entityId) FROM EntityIdentity identity WHERE identity.identityKey IN :identityKeys")
    long countDistinctEntityIdsByIdentityKeyIn(@Param("identityKeys") Set<String> identityKeys);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM EntityIdentity identity WHERE identity.entityId = :entityId")
    void deleteAllByEntityId(@Param("entityId") Long entityId);

    long countByEntityId(Long entityId);
}
