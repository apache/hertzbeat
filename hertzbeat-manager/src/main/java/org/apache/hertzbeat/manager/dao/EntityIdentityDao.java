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

import java.util.Collection;
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

    @Query("SELECT identity FROM EntityIdentity identity, ObserveEntity entity "
            + "WHERE identity.entityId = entity.id AND entity.workspaceId = :workspaceId "
            + "AND identity.entityId IN :entityIds "
            + "ORDER BY identity.entityId ASC, identity.priority DESC, identity.id ASC")
    List<EntityIdentity> findAllOwnedByWorkspaceIdAndEntityIdIn(
            @Param("workspaceId") String workspaceId, @Param("entityIds") Collection<Long> entityIds);

    @Query("SELECT identity FROM EntityIdentity identity, ObserveEntity entity "
            + "WHERE identity.entityId = entity.id AND entity.workspaceId = :workspaceId "
            + "AND identity.entityId = :entityId ORDER BY identity.priority DESC, identity.id ASC")
    List<EntityIdentity> findAllOwnedByWorkspaceIdAndEntityId(
            @Param("workspaceId") String workspaceId, @Param("entityId") Long entityId);

    List<EntityIdentity> findAllByIdentityKeyInAndNormalizedValueIn(Set<String> identityKeys, Set<String> normalizedValues);

    @Query("SELECT identity FROM EntityIdentity identity, ObserveEntity entity "
            + "WHERE identity.entityId = entity.id AND entity.workspaceId = :workspaceId "
            + "AND identity.identityKey IN :identityKeys AND identity.normalizedValue IN :normalizedValues")
    List<EntityIdentity> findAllOwnedByWorkspaceIdAndIdentityKeyInAndNormalizedValueIn(
            @Param("workspaceId") String workspaceId,
            @Param("identityKeys") Set<String> identityKeys,
            @Param("normalizedValues") Set<String> normalizedValues);

    @Query("SELECT identity FROM EntityIdentity identity, ObserveEntity entity "
            + "WHERE identity.entityId = entity.id AND entity.workspaceId = :workspaceId "
            + "AND identity.identityKey IN :identityKeys AND identity.normalizedValue IN :normalizedValues "
            + "ORDER BY identity.id ASC")
    List<EntityIdentity> findAllOwnedByWorkspaceIdAndIdentityKeyInAndNormalizedValueIn(
            @Param("workspaceId") String workspaceId,
            @Param("identityKeys") Set<String> identityKeys,
            @Param("normalizedValues") Set<String> normalizedValues,
            Pageable pageable);

    List<EntityIdentity> findAllByIdentityKeyInOrderByIdDesc(Set<String> identityKeys, Pageable pageable);

    @Query("SELECT COUNT(DISTINCT identity.entityId) FROM EntityIdentity identity WHERE identity.identityKey IN :identityKeys")
    long countDistinctEntityIdsByIdentityKeyIn(@Param("identityKeys") Set<String> identityKeys);

    @Query("SELECT COUNT(DISTINCT identity.entityId) FROM EntityIdentity identity, ObserveEntity entity "
            + "WHERE identity.entityId = entity.id AND entity.workspaceId = :workspaceId "
            + "AND identity.identityKey IN :identityKeys")
    long countDistinctOwnedEntityIdsByWorkspaceIdAndIdentityKeyIn(
            @Param("workspaceId") String workspaceId, @Param("identityKeys") Set<String> identityKeys);

    @Query("SELECT identity.entityId, COUNT(identity) FROM EntityIdentity identity WHERE identity.entityId IN :entityIds GROUP BY identity.entityId")
    List<Object[]> countByEntityIdInGroupByEntityId(@Param("entityIds") Collection<Long> entityIds);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM EntityIdentity identity WHERE identity.entityId = :entityId")
    void deleteAllByEntityId(@Param("entityId") Long entityId);

    long countByEntityId(Long entityId);
}
