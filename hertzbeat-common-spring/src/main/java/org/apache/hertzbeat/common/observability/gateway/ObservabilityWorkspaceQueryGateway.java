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

package org.apache.hertzbeat.common.observability.gateway;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.ObserveEntity;

/**
 * Workspace-level read gateway for observability orchestration.
 */
public interface ObservabilityWorkspaceQueryGateway {

    long countMonitors();

    long countCollectors();

    long countCollectorsByStatus(byte status);

    Optional<Monitor> findLatestMonitor();

    long countDistinctBoundEntityIdsByIdentityKeys(Set<String> identityKeys);

    long countDistinctBoundEntityIdsByIdentityKeys(String workspaceId, Set<String> identityKeys);

    List<EntityIdentity> findIdentitiesByKeysAndNormalizedValues(Set<String> identityKeys, Set<String> normalizedValues);

    List<EntityIdentity> findIdentitiesByKeysAndNormalizedValues(
            String workspaceId, Set<String> identityKeys, Set<String> normalizedValues);

    Map<Long, ObserveEntity> findEntitiesByIds(Set<Long> entityIds);

    Map<Long, ObserveEntity> findEntitiesByIds(String workspaceId, Set<Long> entityIds);

    long countMonitorBindsByEntityId(Long entityId);

    long countMonitorBindsByEntityId(String workspaceId, Long entityId);

    Optional<ObserveEntity> findEntityById(Long entityId);

    /** Find an entity only when it belongs to the explicit trusted workspace. */
    Optional<ObserveEntity> findEntityById(String workspaceId, Long entityId);

    List<EntityIdentity> findIdentitiesByEntityId(Long entityId);

    /** Find identities only after the owning entity is verified in the explicit trusted workspace. */
    List<EntityIdentity> findIdentitiesByEntityId(String workspaceId, Long entityId);

    default void recordEntityDiscoveryGovernanceActivity(String workspaceId, String action, String status,
                                                         String summary, String detail,
                                                         Map<Long, String> entityRefs) {
        // Optional write boundary for manager-backed governance workflows.
    }
}
