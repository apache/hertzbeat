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
import jakarta.persistence.Version;

import lombok.Getter;
import lombok.Setter;

/** Owner/session scoped grant and one-time challenge state. Never contains a provider secret. */
@Getter
@Setter
@Entity
@Table(name = "hzb_agent_permission_state")
public class AgentPermissionState {
    @Id
    @Column(length = 64)
    private String id;

    @Column(nullable = false, length = 64)
    private String sessionUid;

    @Column(nullable = false, length = 16)
    private String mode = "MANUAL";

    private long generation;
    private long expiresAt;

    @Column(length = 64)
    private String rolesHash;

    @Column(length = 64)
    private String challengeHash;

    private long challengeGeneration;
    private long notBefore;
    private long challengeExpiresAt;

    @Column(length = 64)
    private String consumedChallengeHash;

    private long consumedGeneration;
    private long consumedGrantGeneration;
    @Version private Long rowVersion;
}
