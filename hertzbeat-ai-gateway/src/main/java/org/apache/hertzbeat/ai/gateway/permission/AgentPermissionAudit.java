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

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.Setter;

/** Atomic permission-change audit; no challenge nonce, prompt, tool arguments or credentials. */
@Getter
@Setter
@Entity
@Table(name = "hzb_agent_permission_audit")
public class AgentPermissionAudit {
    @Id
    @Column(length = 64)
    private String id;

    @Column(nullable = false, length = 64)
    private String scopeId;

    @Column(nullable = false, length = 64)
    private String sessionUid;

    @Column(nullable = false, length = 128)
    private String actorId;

    @Column(nullable = false, length = 128)
    private String workspaceId;

    @Column(nullable = false, length = 32)
    private String action;

    private long generation;
    private long occurredAt;
    private long expiresAt;
}
