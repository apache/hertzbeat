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

package org.apache.hertzbeat.ai.gateway.permission;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Persistent permission state records. */
@Repository
public interface AgentPermissionStateDao extends JpaRepository<AgentPermissionState, String> {
    @org.springframework.transaction.annotation.Transactional(
            readOnly = true,
            propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW,
            isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    @org.springframework.data.jpa.repository.Query(
            "select count(state) from AgentPermissionState state where state.id=:id and"
                + " state.generation=:generation and state.mode='FULL' and state.expiresAt>:now and"
                + " state.rolesHash=:rolesHash")
    long countActiveGrant(
            @org.springframework.data.repository.query.Param("id") String id,
            @org.springframework.data.repository.query.Param("generation") long generation,
            @org.springframework.data.repository.query.Param("rolesHash") String rolesHash,
            @org.springframework.data.repository.query.Param("now") long now);
}
